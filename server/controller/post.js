const conn = require('../mysql');
const { logError } = require('../logError');
const { verifyToken, OWNER_OR_ADMIN } = require('./authUser');
const { textField, richTextHasContent } = require('./validate');
const { findRemoteResource } = require('../postImages');

/** posts.title 이 varchar(255) 라 그보다 낮게 둡니다. */
const MAX_TITLE_LENGTH = 200;

/**
 * 본문 상한. posts.content 는 mediumtext(16MB)지만 요청 본문 상한이 3mb 라
 * 실제로는 그쪽에 먼저 걸립니다. 여기 값은 그 아래를 지키는 최후의 선입니다.
 */
const MAX_CONTENT_LENGTH = 1_000_000;

/**
 * 제목과 본문을 검사해 다듬은 값을 돌려줍니다.
 *
 * 본문은 trim 만으로는 빈 글이 걸러지지 않습니다. 에디터(ReactQuill)가 아무것도
 * 안 쓴 상태를 `<p><br></p>` 로 보내서, 제목만 있는 글이 그대로 등록됐습니다.
 */
const validatePost = (body) => {
    const title = textField(body.title, { label: '제목', max: MAX_TITLE_LENGTH });
    if (title.error) return { error: title.error };

    const content = textField(body.content, { label: '내용', max: MAX_CONTENT_LENGTH });
    if (content.error) return { error: content.error };
    if (!richTextHasContent(content.value)) {
        return { error: '내용을 입력해주세요.' };
    }

    /*
     * 본문이 바깥 주소를 받아오게 두지 않습니다 (../postImages.js 에 이유를 적었습니다).
     * 후기 사진에 이미 같은 잣대가 있는데(controller/review.js 의 IMAGE_DATA_URL)
     * 글 본문에만 없어서, 남의 서버 이미지가 그대로 저장되고 있었습니다.
     */
    const remote = findRemoteResource(content.value);
    if (remote) {
        return { error: '본문에는 직접 올린 사진만 넣을 수 있습니다.' };
    }

    return { value: { title: title.value, content: content.value } };
};

// 게시글 ID로 게시글 조회
const getPostById = (req, res) => {
    const post_id = req.params.post_id;

    // user_id 는 화면에서 작성자에게만 수정·삭제 버튼을 보이기 위해 함께 내려줍니다.
    const query = 'SELECT p.post_id, p.user_id, p.category_id, p.title, p.content, p.created_at, u.username AS author FROM posts p JOIN users u ON p.user_id = u.user_id WHERE p.post_id = ? AND p.deleted_at IS NULL';

    conn.query(query, [post_id], (err, results) => {
        if (err) {
            logError('post', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        if (results.length === 0) {
            return res.status(404).send({ message: '해당 게시글을 찾을 수 없습니다.' });
        }

        const post = results[0];
        return res.send(post);
    });
};


// 새로운 게시글 추가
const addPostById = (req, res) => {
    const { category_id } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const { error, value } = validatePost(req.body);
    if (error) return res.status(400).send({ message: error });

    const user_id = decoded.id;

    /*
     * VALUES 가 아니라 users 에서 골라 넣습니다.
     *
     * 탈퇴해도 토큰은 하루 남아 있어서, 그 토큰으로 글을 계속 쓸 수 있으면 안 됩니다.
     * 조회를 한 번 더 하는 대신 INSERT 조건에 얹어 affectedRows 로 판단합니다.
     */
    const query = `
        INSERT INTO posts (category_id, user_id, title, content, created_at, updated_at)
        SELECT ?, user_id, ?, ?, NOW(), NOW()
          FROM users WHERE user_id = ? AND deleted_at IS NULL`;

    conn.query(query, [category_id, value.title, value.content, user_id], (err, results) => {
        if (err) {
            logError('post', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        if (results.affectedRows === 0) {
            return res.status(401).send({ message: '사용할 수 없는 계정입니다.' });
        }

        return res.send({ message: '새로운 게시글이 등록되었습니다.', postId: results.insertId });
    });
};

// 게시글 수정
const updatePostById = (req, res) => {
    const post_id = req.params.post_id;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const { error, value } = validatePost(req.body);
    if (error) return res.status(400).send({ message: error });

    const user_id = decoded.id;

    const query = 'UPDATE posts SET title = ?, content = ?, updated_at = NOW() WHERE post_id = ? and user_id = ? and deleted_at IS NULL';

    conn.query(query, [value.title, value.content, post_id, user_id], (err, results) => {
        if (err) {
            logError('post', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }


        if (results.affectedRows === 0) {
            return res.status(404).send({ message: '작성자만 게시글을 수정할 수 있습니다.' });
        }

        return res.send({ message: '게시글이 수정되었습니다.' });
    });
};

// 게시글 삭제
const deletePostById = (req, res) => {
    const post_id = req.params.post_id;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    /*
     * 실제로 지우지 않고 지운 시각만 남깁니다(soft delete).
     * 잘못 지웠을 때 deleted_at 을 NULL 로 되돌리면 글이 그대로 살아납니다.
     *
     * 시각을 SQL 의 NOW() 대신 여기서 만들어 두 문장에 같은 값을 씁니다.
     * 그래야 나중에 "이 글과 같이 지워진 댓글" 을 시각으로 정확히 골라 되살릴 수 있습니다.
     */
    const deletedAt = new Date();
    const query = `UPDATE posts SET deleted_at = ?
                    WHERE post_id = ? AND deleted_at IS NULL AND ${OWNER_OR_ADMIN}`;

    conn.query(query, [deletedAt, post_id, user_id, user_id], (err, results) => {
        if (err) {
            logError('post', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).send({ message: '작성자 또는 관리자만 게시글을 삭제할 수 있습니다.' });
        }

        /*
         * 예전에는 FK 의 ON DELETE CASCADE 가 댓글을 함께 지웠습니다.
         * 표시만 남기는 방식에서는 CASCADE 가 걸리지 않으므로 댓글도 직접 표시합니다.
         * 이미 지워져 있던 댓글은 건드리지 않아, 글을 되살려도 그대로 지워진 채 남습니다.
         */
        conn.query(
            'UPDATE comments SET deleted_at = ? WHERE post_id = ? AND deleted_at IS NULL',
            [deletedAt, post_id],
            (commentErr) => {
                if (commentErr) {
                    logError('post', commentErr);
                    return res.status(500).send({ message: '서버 에러 발생' });
                }

                return res.send({ message: '게시글이 삭제되었습니다.' });
            }
        );
    });
};

module.exports = {
    getPostById,
    addPostById,
    updatePostById,
    deletePostById
};
