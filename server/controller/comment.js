const conn = require('../mysql');
const { verifyToken, IS_ADMIN } = require('./authUser');

/** 한 쪽에 보여 줄 스레드(원댓글) 수. 화면 기본값과 맞춰 둡니다. */
const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 30;

const query = (sql, values) =>
    new Promise((resolve, reject) => {
        conn.query(sql, values, (error, results) => (error ? reject(error) : resolve(results)));
    });

/*
 * "원댓글" 의 조건.
 *
 * parent_comment_id 가 없는 것뿐 아니라 부모가 지워진 답글도 포함합니다.
 * 지우면 행은 남고 조회에서만 빠지므로(soft delete) 답글의 parent_comment_id 는
 * 그대로인데, 화면은 그런 답글을 원댓글 자리로 올려 그립니다
 * (client/src/comment/CommentSection.tsx 의 isRoot). 여기서 같은 기준을 쓰지 않으면
 * 그 답글이 어느 쪽에도 안 실려 영영 안 보이게 됩니다.
 */
const ROOT_SOURCE = `
        FROM comments c
        LEFT JOIN comments p ON p.comment_id = c.parent_comment_id AND p.deleted_at IS NULL
        WHERE c.post_id = ? AND c.deleted_at IS NULL
          AND (c.parent_comment_id IS NULL OR p.comment_id IS NULL)`;

/**
 * 특정 게시글의 댓글. 스레드 단위로 쪽을 나눕니다.
 *
 * 댓글을 줄 단위로 자르면 답글이 부모와 떨어져 화면에서 사라집니다.
 * 이 쪽에 보일 원댓글을 먼저 고르고, 그 아래 답글을 깊이에 상관없이 딸려 보냅니다.
 */
const getCommentsByPostId = async (req, res) => {
    const post_id = req.params.post_id;
    const { page, limit } = req.query;

    const asked = Number(limit);
    const rowLimit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
    const askedPage = Number(page);
    const offset = (Number.isInteger(askedPage) && askedPage > 0 ? askedPage - 1 : 0) * rowLimit;

    try {
        /*
         * total  = 스레드 수. 쪽 번호를 그리는 데 씁니다.
         * count  = 이 글의 전체 댓글 수. 머리말의 "댓글 N개" 입니다.
         */
        const [counts] = await query(
            `SELECT (SELECT COUNT(*) ${ROOT_SOURCE}) AS total,
                    (SELECT COUNT(*) FROM comments WHERE post_id = ? AND deleted_at IS NULL) AS count`,
            [post_id, post_id],
        );

        const roots = await query(
            `SELECT c.comment_id ${ROOT_SOURCE} ORDER BY c.created_at ASC, c.comment_id ASC LIMIT ? OFFSET ?`,
            [post_id, rowLimit, offset],
        );

        if (roots.length === 0) {
            return res.send({ comments: [], total: counts.total, count: counts.count });
        }

        // 고른 원댓글에서 시작해 답글의 답글까지 따라 내려갑니다.
        const comments = await query(
            `WITH RECURSIVE thread AS (
                SELECT comment_id FROM comments WHERE comment_id IN (?)
                UNION ALL
                SELECT c.comment_id
                  FROM comments c
                  JOIN thread t ON c.parent_comment_id = t.comment_id
                 WHERE c.deleted_at IS NULL
             )
             SELECT c.comment_id, c.user_id, c.content, c.created_at,
                    u.username AS author, c.parent_comment_id
               FROM comments c
               JOIN users u ON c.user_id = u.user_id
              WHERE c.comment_id IN (SELECT comment_id FROM thread)
              ORDER BY c.created_at ASC, c.comment_id ASC`,
            [roots.map((row) => row.comment_id)],
        );

        return res.send({ comments, total: counts.total, count: counts.count });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: '서버 오류 발생' });
    }
};

// 댓글 작성
const addComment = (req, res) => {
    const { post_id, content, parent_comment_id } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = 'INSERT INTO comments (post_id, user_id, content, parent_comment_id, created_at) VALUES (?, ?, ?, ?, NOW())';

    conn.query(query, [post_id, user_id, content, parent_comment_id || null], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        return res.send({ message: '새로운 댓글이 등록되었습니다.', commentId: results.insertId });
    });
};

// 댓글 수정
const updateCommentById = (req, res) => {
    const comment_id = req.params.comment_id;
    const { content } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = 'UPDATE comments SET content = ?, created_at = NOW() WHERE comment_id = ? and user_id = ? and deleted_at IS NULL';

    conn.query(query, [content, comment_id, user_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).send({ message: '작성자만 댓글을 수정할 수 있습니다.' });
        }

        return res.send({ message: '댓글이 수정되었습니다.' });
    });
};

// 댓글 삭제
const deleteCommentById = (req, res) => {
    const comment_id = req.params.comment_id;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    // 지울 수 있는지, 그리고 관리자 자격으로 지우는지를 함께 봅니다.
    // 관리자면 달린 답글까지 정리하고, 작성자 본인이면 그 댓글 하나만 지웁니다.
    const permissionQuery = `
        SELECT c.user_id = ? AS isOwner, ${IS_ADMIN} AS isAdmin
          FROM comments c
         WHERE c.comment_id = ? AND c.deleted_at IS NULL`;

    conn.query(permissionQuery, [user_id, user_id, comment_id], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        const permission = rows[0];
        // 없는 댓글인지 남의 댓글인지 구분해서 알려주면 남의 글 존재 여부가 새어 나갑니다.
        if (!permission || (!permission.isOwner && !permission.isAdmin)) {
            return res.status(404).send({ message: '작성자 또는 관리자만 댓글을 삭제할 수 있습니다.' });
        }

        // 작성자 본인이 지울 때는 그 댓글 하나만 표시합니다.
        // 남이 단 답글이 내 댓글을 지운다고 함께 사라지면 곤란해서 그대로 둡니다.
        // 부모가 화면에서 사라진 답글은 클라이언트가 원댓글 자리로 올려 그립니다.
        if (!permission.isAdmin) {
            const query = 'UPDATE comments SET deleted_at = ? WHERE comment_id = ? AND deleted_at IS NULL';
            return conn.query(query, [new Date(), comment_id], (deleteErr) => {
                if (deleteErr) {
                    console.error(deleteErr);
                    return res.status(500).send({ message: '서버 에러 발생' });
                }

                return res.send({ message: '댓글이 삭제되었습니다.', deletedCount: 1 });
            });
        }

        // 관리자는 스레드를 통째로 정리하는 쪽이라 답글을 끝까지 따라갑니다.
        // 화면은 2단까지만 들여쓰지만 parent_comment_id 는 더 깊게 이어질 수 있어 재귀로 모읍니다.
        const threadQuery = `
            WITH RECURSIVE thread AS (
              SELECT comment_id FROM comments
               WHERE comment_id = ? AND deleted_at IS NULL
              UNION ALL
              SELECT c.comment_id
                FROM comments c
                JOIN thread t ON c.parent_comment_id = t.comment_id
               WHERE c.deleted_at IS NULL
            )
            SELECT comment_id FROM thread`;

        conn.query(threadQuery, [comment_id], (threadErr, threadRows) => {
            if (threadErr) {
                console.error(threadErr);
                return res.status(500).send({ message: '서버 에러 발생' });
            }

            const ids = threadRows.map((row) => row.comment_id);

            const deleteQuery = 'UPDATE comments SET deleted_at = ? WHERE comment_id IN (?) AND deleted_at IS NULL';
            conn.query(deleteQuery, [new Date(), ids], (deleteErr, results) => {
                if (deleteErr) {
                    console.error(deleteErr);
                    return res.status(500).send({ message: '서버 에러 발생' });
                }

                return res.send({
                    message: '댓글이 삭제되었습니다.',
                    deletedCount: results.affectedRows,
                });
            });
        });
    });
};

module.exports = {
    getCommentsByPostId,
    addComment,
    updateCommentById,
    deleteCommentById
};
