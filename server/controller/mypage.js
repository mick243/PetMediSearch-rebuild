const conn = require('../mysql');
const { logError } = require('../logError');
const { verifyToken } = require("./authUser");

/** 마이페이지 칸 하나에 보여 줄 수. 최근 것만 보여 주는 자리입니다. */
const RECENT_LIMIT = 20;

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
            logError('mypage', err);
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

    /*
     * 사진 자체는 빼고 장수만 보냅니다 (controller/review.js 의 목록과 같은 이유).
     *
     * 예전에는 `SELECT *` 였습니다. LIMIT 20 으로 건수만 줄이고 컬럼은 그대로라
     * images 가 통째로 따라 나갔습니다. 사진 두 장 붙은 후기를 하나 가진 계정이
     * 214,370B 였습니다 — 시설 목록이 같은 후기 다섯 건을 725B 로 주는 것과
     * 견주면 300배입니다. 20건에 장당 5장이면 10MB 가 됩니다.
     *
     * 이 칸은 사진을 보여 주지도 않습니다(components/myProfile/MyReview.tsx).
     * 화면 타입(types/review.type.ts 의 ReviewData)은 진작 image_count 를 받기로
     * 적어 두었는데, 여기서만 그 값을 안 보내고 사진을 보내고 있었습니다.
     */
    const query = `
        SELECT review_id, user_id, facility_id, rating, review_content, created_at,
               COALESCE(JSON_LENGTH(images), 0) AS image_count
          FROM reviews WHERE user_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC, review_id DESC LIMIT ?`;

    conn.query(query, [user_id, RECENT_LIMIT], (err, results) => {
        if (err) {
            logError('mypage', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }

        // 쓴 후기가 없는 것도 오류가 아닙니다 (controller/review.js 와 같은 판단).
        return res.send(results);
    });
};

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
            logError('mypage', err);
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