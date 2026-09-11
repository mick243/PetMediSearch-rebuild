const conn = require('../mysql');
const { verifyToken } = require('./authUser');

/*
 * 붙임 사진은 브라우저에서 줄인 JPEG 를 data URL 로 받습니다 (pets.photo 와 같은 방식).
 *
 * 화면이 이미 줄여서 보내지만 요청은 화면을 거치지 않고도 올 수 있어 여기서 한 번 더 봅니다.
 * 특히 data URL 이 아닌 값(예: 남의 서버 주소)을 그대로 저장하면, 후기를 보는 사람의
 * 브라우저가 그 주소를 대신 불러 주게 됩니다.
 */
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
/** mediumtext 는 16MB 까지 들어가지만, 본문 상한(app.js 의 3mb)에 맞춰 더 좁게 둡니다. */
const MAX_IMAGE_LENGTH = 2 * 1024 * 1024;

/** 한 후기에 붙일 수 있는 장수. 본문 상한(app.js 의 3mb)과 보기 좋은 수를 함께 본 값입니다. */
const MAX_IMAGES = 5;

/**
 * 저장할 JSON 문자열(사진이 없으면 null)을 돌려주고, 값이 이상하면 false 를 돌려줍니다.
 * 화면은 늘 목록 전체를 보내므로, 여기서 받은 것이 곧 저장될 전부입니다.
 */
const normalizeImages = (value) => {
    if (value === undefined || value === null) return null;
    if (!Array.isArray(value)) return false;

    const kept = value.filter((v) => v !== null && v !== undefined && v !== '');
    if (kept.length === 0) return null;
    if (kept.length > MAX_IMAGES) return false;

    for (const one of kept) {
        if (typeof one !== 'string') return false;
        if (one.length > MAX_IMAGE_LENGTH) return false;
        if (!IMAGE_DATA_URL.test(one)) return false;
    }
    return JSON.stringify(kept);
};

/** 한 번에 보낼 후기 수. 화면의 쪽 크기와 맞춰 둡니다. */
const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 20;

/**
 * 시설별 후기. 페이지 단위로 끊어 보냅니다.
 *
 * 예전에는 그 시설의 후기를 전부 내려주고 화면에서 5건씩 잘라 썼습니다.
 * 후기에 사진이 붙으면서, 후기가 몰린 병원 한 곳이 14MB 가 됐습니다.
 * 사진은 한 장에 100KB 가 넘으므로 건수를 줄이는 것 말고 답이 없습니다.
 */
const getReviewsByFacilityId = async (req, res) => {
    const facilityId = req.params.facility_id;
    const { page, limit } = req.query;

    const asked = Number(limit);
    const rowLimit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
    const askedPage = Number(page);
    const offset = (Number.isInteger(askedPage) && askedPage > 0 ? askedPage - 1 : 0) * rowLimit;

    /*
     * 사진 자체는 빼고 장수만 보냅니다.
     *
     * 화면은 후기를 펼쳐야 사진을 보여 주는데, 목록에 실어 보내면 펼치지 않은
     * 것까지 전부 내려옵니다. 한 장이 100KB 가 넘어 5건짜리 한 쪽이 429KB 였습니다.
     * 사진은 펼칠 때 /reviews/:id/images 로 그 글 것만 받아갑니다.
     */
    const listQuery = `
        SELECT review_id, user_id, facility_id, rating, review_content, created_at,
               COALESCE(JSON_LENGTH(images), 0) AS image_count
        FROM reviews WHERE facility_id = ? ORDER BY created_at DESC, review_id DESC LIMIT ? OFFSET ?`;

    conn.query(listQuery, [facilityId, rowLimit, offset], (error, results) => {
        if (error) {
            return res.status(500).send({ message: '서버 오류 발생' });
        }
        conn.query('SELECT COUNT(*) AS total FROM reviews WHERE facility_id = ?', [facilityId], (countError, countRows) => {
            if (countError) {
                return res.status(500).send({ message: '서버 오류 발생', error: countError });
            }
            // 후기가 없는 것은 오류가 아닙니다. 예전에는 404 라서 화면이 콘솔에 에러를 찍었습니다.
            return res.send({ reviews: results, total: countRows[0]?.total ?? results.length });
        });
    });
};

/** 후기 한 건의 사진. 목록에서 뺐으므로 펼칠 때 여기서 받아갑니다. */
const getReviewImages = async (req, res) => {
    const reviewId = req.params.review_id;

    conn.query('SELECT images FROM reviews WHERE review_id = ?', [reviewId], (error, results) => {
        if (error) {
            return res.status(500).send({ message: '서버 오류 발생' });
        }
        if (results.length === 0) {
            return res.status(404).send({ message: '후기를 찾을 수 없습니다.' });
        }
        return res.send({ images: results[0].images ?? [] });
    });
};

// 리뷰 등록
const createReview = async (req, res) => {
    const { facility_id, rating, review_content, images } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    if (!user_id || !facility_id || !rating || !review_content) {
        return res.status(400).send({ message: '필드가 누락되었습니다.' });
    }

    const photos = normalizeImages(images);
    if (photos === false) {
        return res.status(400).send({ message: '사진을 읽을 수 없습니다.' });
    }

    const query = `
        INSERT INTO reviews (user_id, facility_id, rating, review_content, images, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
    `;

    conn.query(query, [user_id, facility_id, rating, review_content, photos], (error, results) => {
        if (error) {
            return res.status(500).send({ message: '서버 오류 발생' });
        }
        return res.status(201).send({ message: '리뷰가 성공적으로 등록되었습니다' });
    });
};

// 리뷰 수정
const updateReview = async (req, res) => {
    const reviewId = req.params.review_id;
    const { rating, review_content, images } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    /*
     * images 를 아예 보내지 않으면 사진은 건드리지 않고, 빈 배열을 보내면 다 뺐다는 뜻입니다.
     * 둘을 구분하지 않으면, 사진을 다룰 줄 모르는 화면이 수정 한 번에 사진을 날립니다.
     */
    const photos = images === undefined ? undefined : normalizeImages(images);
    if (photos === false) {
        return res.status(400).send({ message: '사진을 읽을 수 없습니다.' });
    }

    const query = `
        UPDATE reviews 
        SET rating = ?, review_content = ?${photos === undefined ? '' : ', images = ?'} 
        WHERE review_id = ? and user_id = ?
    `;
    const values =
        photos === undefined
            ? [rating, review_content, reviewId, user_id]
            : [rating, review_content, photos, reviewId, user_id];

    conn.query(query, values, (error, results) => {
        if (error) {
            return res.status(500).send({ message: '서버 오류 발생' });
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
        return res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
    }

    const user_id = decoded.id;

    const query = `
        DELETE FROM reviews 
        WHERE review_id = ? and user_id = ?
    `;

    conn.query(query, [reviewId, user_id], (error, results) => {
        if (error) {
            return res.status(500).send({ message: '서버 오류 발생' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).send({ message: '작성자만 삭제할 수 있습니다.' });
        }
        return res.status(200).send({ message: '리뷰가 삭제되었습니다.' });
    });
};

module.exports = {
    getReviewsByFacilityId,
    getReviewImages,
    createReview,
    updateReview,
    deleteReview,
};
