const conn = require('../mysql');
const { verifyToken } = require("./authUser");

// 유저 id 에 따른 게시글 조회
const getPostsByUserId = (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ error: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = 'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC';

    conn.query(query, [user_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: '서버 에러 발생' });
        }

        if (results.length === 0) {
            return res.status(404).send({ message: '작성된 게시글이 아직 없습니다.' });
        }

        const posts = results;
        return res.send(posts);
    });
};

// 유저 id 에 따른 후기글 조회
const getReviewsByUserId = (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ error: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = 'SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC';

    conn.query(query, [user_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: '서버 에러 발생' });
        }

        if (results.length === 0) {
            return res.status(404).send({ message: '작성된 후기가 아직 없습니다.' });
        }

        const reviews = results;
        return res.send(reviews);
    });
};

module.exports = {
    getPostsByUserId,
    getReviewsByUserId
}