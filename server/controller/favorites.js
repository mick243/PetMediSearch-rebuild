const conn = require('../mysql');
const { verifyToken } = require('./authUser');

function requireUser(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        res.status(401).send({ error: '유효하지 않은 토큰입니다.' });
        return null;
    }
    return decoded.id;
}

// 단골 병원·약국 목록 (시설 정보 포함)
const getFavorites = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const query = `
        SELECT f.facility_id, f.created_at,
               m.bplcnm, m.type, m.rdnwhladdr, m.sitewhladdr, m.sitetel, m.lat, m.lng, m.dtlstatenm
        FROM favorite_facilities f
        JOIN medical_facilities m ON m.id = f.facility_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC`;
    conn.query(query, [user_id], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: '서버 에러 발생' });
        }
        return res.send(rows);
    });
};

// 단골 추가. 이미 있으면 그대로 성공 처리
const addFavorite = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    conn.query(
        'INSERT IGNORE INTO favorite_facilities (user_id, facility_id) VALUES (?, ?)',
        [user_id, req.params.facility_id],
        (err) => {
            if (err) {
                console.error(err);
                // 없는 시설 id 면 FK 에러
                if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                    return res.status(404).send({ message: '해당 시설을 찾을 수 없습니다.' });
                }
                return res.status(500).send({ error: '서버 에러 발생' });
            }
            return res.send({ message: '단골로 등록했습니다.' });
        }
    );
};

// 단골 해제
const removeFavorite = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    conn.query(
        'DELETE FROM favorite_facilities WHERE user_id = ? AND facility_id = ?',
        [user_id, req.params.facility_id],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send({ error: '서버 에러 발생' });
            }
            return res.send({ message: '단골에서 해제했습니다.' });
        }
    );
};

module.exports = { getFavorites, addFavorite, removeFavorite };
