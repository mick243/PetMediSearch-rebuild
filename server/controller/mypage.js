const conn = require('../mysql');
const { verifyToken } = require("./authUser");

// 유저 id 에 따른 게시글 조회
const getPostsByUserId = (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    // 마이페이지는 최근 것만 보여 주는 칸입니다. 본문이 붙어 있어 전부 내려보내지 않습니다.
    const query = 'SELECT * FROM posts WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20';

    conn.query(query, [user_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        // 쓴 글이 없는 것은 오류가 아닙니다. 빈 목록을 그대로 보냅니다.
        return res.send(results);
    });
};

// 유저 id 에 따른 후기글 조회
const getReviewsByUserId = (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    // 후기에는 사진이 붙어 있어 더더욱 전부 내려보내면 안 됩니다.
    const query = 'SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 20';

    conn.query(query, [user_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        // 쓴 후기가 없는 것도 오류가 아닙니다 (controller/review.js 와 같은 판단).
        return res.send(results);
    });
};

/** 마이페이지 칸 하나에 보여 줄 수. 최근 것만 보여 주는 자리입니다. */
const RECENT_LIMIT = 20;

// 유저 id 에 따른 댓글 조회
const getCommentsByUserId = (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    /*
     * 내가 쓴 댓글. 어느 글에 달았는지 제목을 함께 보냅니다.
     *
     * 댓글만 내려주면 "저도 그랬어요" 같은 한 줄이 늘어설 뿐, 눌러서 글로 가기
     * 전에는 무슨 얘기였는지 알 수 없습니다. 제목이 있어야 목록이 목록 구실을 합니다.
     *
     * 글이 지워졌으면 댓글도 뺍니다. 남겨 두면 눌렀을 때 갈 곳이 없습니다.
     * JOIN 의 deleted_at 조건이 그 역할을 합니다(LEFT JOIN 이 아니라 INNER JOIN).
     */
    const query = `
        SELECT c.comment_id, c.post_id, c.content, c.created_at,
               p.title AS post_title
          FROM comments c
          JOIN posts p ON p.post_id = c.post_id AND p.deleted_at IS NULL
         WHERE c.user_id = ? AND c.deleted_at IS NULL
         ORDER BY c.created_at DESC, c.comment_id DESC
         LIMIT ?`;

    conn.query(query, [user_id, RECENT_LIMIT], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        // 댓글이 없는 것은 오류가 아닙니다. 빈 목록을 그대로 보냅니다.
        return res.send(results);
    });
};

module.exports = {
    getPostsByUserId,
    getReviewsByUserId,
    getCommentsByUserId
}