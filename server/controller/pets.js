const conn = require('../mysql');
const { logError } = require('../logError');
const { verifyToken } = require('./authUser');
const { textField, decimalField, dateField, timeField, yearsFromToday } = require('./validate');

/** pets.weight_kg 는 decimal(5,2) 라 999.99 까지 들어가지만, 실제로 가능한 범위로 좁힙니다. */
const MAX_WEIGHT_KG = 200;

/**
 * 반려동물 입력값 검사. 등록과 수정이 같이 씁니다.
 * 이름 말고는 비워 둘 수 있습니다 — 품종이나 생일을 모르는 경우가 흔합니다.
 */
const validatePet = (body) => {
    const name = textField(body.name, { label: '이름', max: 50 });
    if (name.error) return { error: name.error };

    const breed = textField(body.breed, { label: '품종', max: 50, required: false });
    if (breed.error) return { error: breed.error };

    // 미래 생일은 홈의 나이 계산을 음수로 만듭니다.
    const birthDate = dateField(body.birth_date, {
        label: '생일',
        required: false,
        future: false,
    });
    if (birthDate.error) return { error: birthDate.error };

    const weight = decimalField(body.weight_kg, {
        label: '몸무게',
        min: 0,
        max: MAX_WEIGHT_KG,
        required: false,
    });
    if (weight.error) return { error: weight.error };

    return {
        value: {
            name: name.value,
            breed: breed.value,
            birth_date: birthDate.value,
            weight_kg: weight.value,
            category_id: body.category_id || null,
            photo: body.photo || null,
        },
    };
};

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
            logError('pets', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        if (pets.length === 0) return res.send([]);

        const ids = pets.map((p) => p.pet_id);
        const vq = `
            SELECT vaccination_id, pet_id, name, due_date, due_time, done
            FROM pet_vaccinations
            WHERE pet_id IN (?)
            ORDER BY due_date ASC, due_time IS NULL, due_time ASC`;
        conn.query(vq, [ids], (verr, vacc) => {
            if (verr) {
                logError('pets:vaccinations', verr);
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

    const { error, value } = validatePet(req.body);
    if (error) return res.status(400).send({ message: error });

    const query = `
        INSERT INTO pets (user_id, name, category_id, breed, birth_date, weight_kg, photo)
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const values = [
        user_id, value.name, value.category_id, value.breed,
        value.birth_date, value.weight_kg, value.photo,
    ];

    conn.query(query, values, (err, result) => {
        if (err) {
            logError('pets', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        return res.send({ message: '반려동물이 등록되었습니다.', petId: result.insertId });
    });
};

// 반려동물 수정 (본인 것만)
const updatePet = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const { error, value } = validatePet(req.body);
    if (error) return res.status(400).send({ message: error });

    const query = `
        UPDATE pets
        SET name = ?, category_id = ?, breed = ?, birth_date = ?, weight_kg = ?, photo = ?
        WHERE pet_id = ? AND user_id = ?`;
    const values = [
        value.name, value.category_id, value.breed,
        value.birth_date, value.weight_kg, value.photo, req.params.pet_id, user_id,
    ];

    conn.query(query, values, (err, result) => {
        if (err) {
            logError('pets', err);
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
                logError('pets', err);
                return res.status(500).send({ message: '서버 에러 발생' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).send({ message: '본인의 반려동물만 삭제할 수 있습니다.' });
            }
            return res.send({ message: '삭제되었습니다.' });
        }
    );
};

/**
 * 일정 입력값 검사. 추가와 수정이 같이 씁니다.
 * 시각은 선택입니다 — 날짜만 아는 일정이 대부분이고, 병원 예약을 잡은 것만 시각이 붙습니다.
 */
const validateVaccination = (body) => {
    const name = textField(body.name, { label: '일정 이름', max: 80 });
    if (name.error) return { error: name.error };

    /*
     * 접종·검진은 앞날 일정이라 미래 날짜를 막지 않습니다. 지난 날짜도 받습니다 —
     * 놓친 일정이나 이미 맞힌 기록을 적을 수 있어야 합니다.
     *
     * 다만 범위는 둡니다. 예전에는 아무 값이나 받아서 1900-01-01 짜리 일정이
     * 그대로 등록됐고, 그러면 홈의 D-day 타일이 "D+46000" 같은 수를 보여 줍니다.
     * 반려동물이 사는 기간을 넉넉히 덮는 앞뒤 30년으로 끊습니다.
     */
    const dueDate = dateField(body.due_date, {
        label: '날짜',
        min: yearsFromToday(-30),
        max: yearsFromToday(30),
    });
    if (dueDate.error) return { error: dueDate.error };

    const dueTime = timeField(body.due_time, { label: '시각' });
    if (dueTime.error) return { error: dueTime.error };

    return { value: { name: name.value, due_date: dueDate.value, due_time: dueTime.value } };
};

// 접종 일정 추가 (반려동물이 본인 것인지 먼저 확인)
const addVaccination = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const { error, value } = validateVaccination(req.body);
    if (error) return res.status(400).send({ message: error });

    const query = `
        INSERT INTO pet_vaccinations (pet_id, name, due_date, due_time)
        SELECT pet_id, ?, ?, ? FROM pets WHERE pet_id = ? AND user_id = ?`;
    const params = [value.name, value.due_date, value.due_time, req.params.pet_id, user_id];
    conn.query(query, params, (err, result) => {
        if (err) {
            logError('pets', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: '본인의 반려동물에만 일정을 추가할 수 있습니다.' });
        }
        return res.send({ message: '일정이 추가되었습니다.', vaccinationId: result.insertId });
    });
};

/*
 * 접종 일정 수정.
 *
 * 예전에는 고칠 방법이 없어, 날짜를 잘못 넣으면 지우고 다시 넣어야 했습니다.
 * 그러면 vaccination_id 가 바뀌어 이미 보낸 알림 기록(vaccination_reminders)이
 * 끊기고, 같은 일정의 알림이 다시 나갑니다.
 *
 * done 은 여기서 건드리지 않습니다. 체크는 목록에서 누르는 별도 조작이고,
 * 수정 화면이 그 값을 덮어쓰면 사용자가 모르는 사이에 완료가 풀립니다.
 */
const updateVaccination = (req, res) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const { error, value } = validateVaccination(req.body);
    if (error) return res.status(400).send({ message: error });

    const query = `
        UPDATE pet_vaccinations v
        JOIN pets p ON p.pet_id = v.pet_id
        SET v.name = ?, v.due_date = ?, v.due_time = ?
        WHERE v.vaccination_id = ? AND p.user_id = ?`;
    const params = [value.name, value.due_date, value.due_time, req.params.vaccination_id, user_id];
    conn.query(query, params, (err, result) => {
        if (err) {
            logError('pets', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: '일정을 찾을 수 없습니다.' });
        }
        return res.send({ message: '수정되었습니다.' });
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
            logError('pets', err);
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
            logError('pets', err);
            return res.status(500).send({ message: '서버 에러 발생' });
        }
        if (result.affectedRows === 0) return res.status(404).send({ message: '일정을 찾을 수 없습니다.' });
        return res.send({ message: '삭제되었습니다.' });
    });
};

module.exports = {
    getMyPets, addPet, updatePet, deletePet,
    addVaccination, updateVaccination, setVaccinationDone, deleteVaccination,
};
