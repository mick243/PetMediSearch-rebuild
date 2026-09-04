const conn = require('../mysql');
const { verifyToken } = require('./authUser');

// 시설 ID에 따른 리뷰 조회
const getReviewsByFacilityId = async (req, res) => {
    const facilityId = req.params.facility_id;

    const query = `SELECT * FROM reviews WHERE facility_id = ? ORDER BY created_at DESC`;

    conn.query(query, [facilityId], (error, results) => {
        if (error) {
            return res.status(500).send({ message: '서버 오류 발생', error });
        }
        if (results.length === 0) {
            return res.status(404).send({ message: '등록된 리뷰가 없습니다.' });
        }
        return res.send(results);
    });
};

// 리뷰 등록
const createReview = async (req, res) => {
    const { facility_id, rating, review_content } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ error: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    if (!user_id || !facility_id || !rating || !review_content) {
        return res.status(400).send({ message: '필드가 누락되었습니다.' });
    }

    const query = `
        INSERT INTO reviews (user_id, facility_id, rating, review_content, created_at) 
        VALUES (?, ?, ?, ?, NOW())
    `;

    conn.query(query, [user_id, facility_id, rating, review_content], (error, results) => {
        if (error) {
            return res.status(500).send({ message: '서버 오류 발생', error });
        }
        return res.status(201).send({ message: '리뷰가 성공적으로 등록되었습니다' });
    });
};

// 리뷰 수정
const updateReview = async (req, res) => {
    const reviewId = req.params.review_id;
    const { rating, review_content } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ error: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = `
        UPDATE reviews 
        SET rating = ?, review_content = ? 
        WHERE review_id = ? and user_id = ?
    `;

    conn.query(query, [rating, review_content, reviewId, user_id], (error, results) => {
        if (error) {
            return res.status(500).send({ message: '서버 오류 발생', error });
        }
        if (results.affectedRows === 0) {
            return res.status(404).send({ message: '작성자만 수정할 수 있습니다.' });
        }
        return res.send({ message: '리뷰가 수정되었습니다.' });
    });
};

// 리뷰 삭제
const deleteReview = async (req, res) => {
    const reviewId = req.params.review_id;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ error: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = `
        DELETE FROM reviews 
        WHERE review_id = ? and user_id = ?
    `;

    conn.query(query, [reviewId, user_id], (error, results) => {
        if (error) {
            return res.status(500).send({ message: '서버 오류 발생', error });
        }
        if (results.affectedRows === 0) {
            return res.status(404).send({ message: '작성자만 삭제할 수 있습니다.' });
        }
        return res.status(200).send({ message: '리뷰가 삭제되었습니다.' });
    });
};

module.exports = {
    getReviewsByFacilityId,
    createReview,
    updateReview,
    deleteReview,
};
