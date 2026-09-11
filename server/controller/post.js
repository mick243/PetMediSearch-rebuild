const conn = require('../mysql');
const { verifyToken, OWNER_OR_ADMIN } = require('./authUser');

// 게시글 ID로 게시글 조회
const getPostById = (req, res) => {
    const post_id = req.params.post_id;

    // user_id 는 화면에서 작성자에게만 수정·삭제 버튼을 보이기 위해 함께 내려줍니다.
    const query = 'SELECT p.post_id, p.user_id, p.category_id, p.title, p.content, p.created_at, u.username AS author FROM posts p JOIN users u ON p.user_id = u.user_id WHERE p.post_id = ? AND p.deleted_at IS NULL';

    conn.query(query, [post_id], (err, results) => {
        if (err) {
            console.error(err);
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
    console.log(req.body);
    const { category_id, title, content } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = 'INSERT INTO posts (category_id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())';

    conn.query(query, [category_id, user_id, title, content], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        return res.send({ message: '새로운 게시글이 등록되었습니다.', postId: results.insertId });
    });
};

// 게시글 수정
const updatePostById = (req, res) => {
    const post_id = req.params.post_id;
    const { title, content } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = 'UPDATE posts SET title = ?, content = ?, updated_at = NOW() WHERE post_id = ? and user_id = ? and deleted_at IS NULL';

    conn.query(query, [title, content, post_id, user_id], (err, results) => {
        if (err) {
            console.error(err);
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
            console.error(err);
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
                    console.error(commentErr);
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
