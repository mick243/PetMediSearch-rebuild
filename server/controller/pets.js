const conn = require('../mysql');
const { verifyToken } = require('./authUser');

/** 토큰에서 사용자 id 를 꺼냅니다. 없으면 401 을 보내고 null 을 돌려줍니다. */
function requireUser(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        res.status(401).send({ message: '유효하지 않은 토큰입니다.' });
        return null;
    }
    return decoded.id;
}

const PET_COLUMNS = `
    p.pet_id, p.user_id, p.name, p.category_id, c.category_name, p.breed,
    p.birth_date, p.weight_kg, p.photo, p.created_at`;

// 내 반려동물 목록 (접종 일정 포함)
const getMyPets = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const query = `
        SELECT ${PET_COLUMNS}
        FROM pets p
        LEFT JOIN categories c ON c.category_id = p.category_id
        WHERE p.user_id = ?
        ORDER BY p.created_at ASC`;

    conn.query(query, [user_id], (err, pets) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        if (pets.length === 0) return res.send([]);

        const ids = pets.map((p) => p.pet_id);
        const vq = `
            SELECT vaccination_id, pet_id, name, due_date, done
            FROM pet_vaccinations
            WHERE pet_id IN (?)
            ORDER BY due_date ASC`;
        conn.query(vq, [ids], (verr, vacc) => {
            if (verr) {
                console.error(verr);
                return res.status(500).send({ message: '서버 에러 발생' });
            }
            const byPet = new Map(ids.map((id) => [id, []]));
            vacc.forEach((v) => byPet.get(v.pet_id).push(v));
            return res.send(pets.map((p) => ({ ...p, vaccinations: byPet.get(p.pet_id) })));
        });
    });
};

// 반려동물 등록
const addPet = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const { name, category_id, breed, birth_date, weight_kg, photo } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).send({ message: '이름을 입력해주세요.' });
    }

    const query = `
        INSERT INTO pets (user_id, name, category_id, breed, birth_date, weight_kg, photo)
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const values = [
        user_id, String(name).trim(), category_id || null, breed || null,
        birth_date || null, weight_kg || null, photo || null,
    ];

    conn.query(query, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        return res.send({ message: '반려동물이 등록되었습니다.', petId: result.insertId });
    });
};

// 반려동물 수정 (본인 것만)
const updatePet = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const { name, category_id, breed, birth_date, weight_kg, photo } = req.body;
    const query = `
        UPDATE pets
        SET name = ?, category_id = ?, breed = ?, birth_date = ?, weight_kg = ?, photo = ?
        WHERE pet_id = ? AND user_id = ?`;
    const values = [
        String(name || '').trim(), category_id || null, breed || null,
        birth_date || null, weight_kg || null, photo || null, req.params.pet_id, user_id,
    ];

    conn.query(query, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: '본인의 반려동물만 수정할 수 있습니다.' });
        }
        return res.send({ message: '수정되었습니다.' });
    });
};

// 반려동물 삭제 (접종 일정은 FK 로 함께 삭제)
const deletePet = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    conn.query(
        'DELETE FROM pets WHERE pet_id = ? AND user_id = ?',
        [req.params.pet_id, user_id],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send({ message: '서버 에러 발생' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).send({ message: '본인의 반려동물만 삭제할 수 있습니다.' });
            }
            return res.send({ message: '삭제되었습니다.' });
        }
    );
};

// 접종 일정 추가 (반려동물이 본인 것인지 먼저 확인)
const addVaccination = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const { name, due_date } = req.body;
    if (!name || !due_date) {
        return res.status(400).send({ message: '이름과 날짜가 필요합니다.' });
    }

    const query = `
        INSERT INTO pet_vaccinations (pet_id, name, due_date)
        SELECT pet_id, ?, ? FROM pets WHERE pet_id = ? AND user_id = ?`;
    conn.query(query, [String(name).trim(), due_date, req.params.pet_id, user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: '본인의 반려동물에만 일정을 추가할 수 있습니다.' });
        }
        return res.send({ message: '일정이 추가되었습니다.', vaccinationId: result.insertId });
    });
};

// 접종 완료 처리 / 되돌리기
const setVaccinationDone = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const done = req.body.done ? 1 : 0;
    const query = `
        UPDATE pet_vaccinations v
        JOIN pets p ON p.pet_id = v.pet_id
        SET v.done = ?
        WHERE v.vaccination_id = ? AND p.user_id = ?`;
    conn.query(query, [done, req.params.vaccination_id, user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        if (result.affectedRows === 0) return res.status(404).send({ message: '일정을 찾을 수 없습니다.' });
        return res.send({ message: '저장되었습니다.' });
    });
};

// 접종 일정 삭제
const deleteVaccination = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const query = `
        DELETE v FROM pet_vaccinations v
        JOIN pets p ON p.pet_id = v.pet_id
        WHERE v.vaccination_id = ? AND p.user_id = ?`;
    conn.query(query, [req.params.vaccination_id, user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        if (result.affectedRows === 0) return res.status(404).send({ message: '일정을 찾을 수 없습니다.' });
        return res.send({ message: '삭제되었습니다.' });
    });
};

module.exports = {
    getMyPets, addPet, updatePet, deletePet,
    addVaccination, setVaccinationDone, deleteVaccination,
};
