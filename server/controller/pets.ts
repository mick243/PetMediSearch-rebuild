import { logError } from '../logError.js';
import { requireUser } from './authUser.js';
import { textField, idField, pathId, decimalField, dateField, timeField, yearsFromToday, isImageDataUrl } from './validate.js';
import type { Checked } from './validate.js';
import pets from '../repositories/pets.js';
import type { PetInput, VaccinationInput } from '../repositories/pets.js';
import type { Request, Response } from 'express';

/*
 * 반려동물 · 접종 일정. DB 는 repositories/pets.ts 가 만지고 여기는 토큰 · 검사 · 응답만 다룹니다.
 */

/** pets.weight_kg 는 decimal(5,2) 라 999.99 까지 들어가지만, 실제로 가능한 범위로 좁힙니다. */
const MAX_WEIGHT_KG = 200;

/**
 * 반려동물 입력값 검사. 등록과 수정이 같이 씁니다.
 * 이름 말고는 비워 둘 수 있습니다 — 품종이나 생일을 모르는 경우가 흔합니다.
 */
const validatePet = (body: Record<string, unknown>): Checked<PetInput> => {
    const name = textField(body.name, { label: '이름', max: 50 });
    if (name.error !== undefined) return { error: name.error };

    const breed = textField(body.breed, { label: '품종', max: 50, required: false });
    if (breed.error !== undefined) return { error: breed.error };

    // 미래 생일은 홈의 나이 계산을 음수로 만듭니다.
    const birthDate = dateField(body.birth_date, { label: '생일', required: false, future: false });
    if (birthDate.error !== undefined) return { error: birthDate.error };

    const weight = decimalField(body.weight_kg, { label: '몸무게', min: 0, max: MAX_WEIGHT_KG, required: false });
    if (weight.error !== undefined) return { error: weight.error };

    // 분류는 고르지 않아도 됩니다. 화면은 그때 null 을 보냅니다.
    const category = idField(body.category_id, { label: '분류', required: false });
    if (category.error !== undefined) return { error: category.error };

    /*
     * 사진도 후기 사진과 같은 규칙으로 봅니다(validate.ts 의 isImageDataUrl).
     * 예전에는 받은 문자열을 그대로 저장해서, data URL 이 아닌 값도 들어갔습니다.
     */
    const photo = body.photo === undefined || body.photo === null || body.photo === '' ? null : body.photo;
    if (photo !== null && !isImageDataUrl(photo)) return { error: '사진을 읽을 수 없습니다.' };

    return {
        value: {
            name: name.value ?? '',
            breed: breed.value ?? null,
            birth_date: birthDate.value ?? null,
            weight_kg: weight.value ?? null,
            category_id: category.value ?? null,
            photo,
        },
    };
};

// 내 반려동물 목록 (접종 일정 포함)
const getMyPets = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    try {
        return res.send(await pets.listMine(user_id));
    } catch (error) {
        logError('pets', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 반려동물 등록
const addPet = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const checked = validatePet(req.body);
    if (checked.error !== undefined) return res.status(400).send({ message: checked.error });

    try {
        const result = await pets.create(user_id, checked.value);
        // 형식은 맞지만 없는 분류 번호(외래 키). post.ts 와 같이 보낸 쪽이 틀린 것으로 봅니다.
        if (result === 'no-such-category') return res.status(400).send({ message: '없는 분류입니다.' });
        return res.send({ message: '반려동물이 등록되었습니다.', petId: result.petId });
    } catch (error) {
        logError('pets', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 반려동물 수정 (본인 것만)
const updatePet = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const checked = validatePet(req.body);
    if (checked.error !== undefined) return res.status(400).send({ message: checked.error });

    const pet_id = pathId(req.params.pet_id);
    try {
        const result = pet_id === null ? 'not-mine' : await pets.update(pet_id, user_id, checked.value);
        if (result === 'no-such-category') return res.status(400).send({ message: '없는 분류입니다.' });
        if (result === 'not-mine') return res.status(404).send({ message: '본인의 반려동물만 수정할 수 있습니다.' });
        return res.send({ message: '수정되었습니다.' });
    } catch (error) {
        logError('pets', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 반려동물 삭제 (접종 일정은 FK 로 함께 삭제)
const deletePet = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const pet_id = pathId(req.params.pet_id);
    try {
        const deleted = pet_id !== null && (await pets.remove(pet_id, user_id));
        if (!deleted) return res.status(404).send({ message: '본인의 반려동물만 삭제할 수 있습니다.' });
        return res.send({ message: '삭제되었습니다.' });
    } catch (error) {
        logError('pets', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

/**
 * 일정 입력값 검사. 추가와 수정이 같이 씁니다.
 * 시각은 선택입니다 — 날짜만 아는 일정이 대부분이고, 병원 예약을 잡은 것만 시각이 붙습니다.
 */
const validateVaccination = (body: Record<string, unknown>): Checked<VaccinationInput> => {
    const name = textField(body.name, { label: '일정 이름', max: 80 });
    if (name.error !== undefined) return { error: name.error };

    /*
     * 접종·검진은 앞날 일정이라 미래 날짜를 막지 않습니다. 지난 날짜도 받습니다 —
     * 놓친 일정이나 이미 맞힌 기록을 적을 수 있어야 합니다.
     *
     * 다만 범위는 둡니다. 예전에는 아무 값이나 받아서 1900-01-01 짜리 일정이
     * 그대로 등록됐고, 그러면 홈의 D-day 타일이 "D+46000" 같은 수를 보여 줍니다.
     * 반려동물이 사는 기간을 넉넉히 덮는 앞뒤 30년으로 끊습니다.
     */
    const dueDate = dateField(body.due_date, { label: '날짜', min: yearsFromToday(-30), max: yearsFromToday(30) });
    if (dueDate.error !== undefined || dueDate.value === null) return { error: dueDate.error ?? '날짜를 입력해주세요.' };

    const dueTime = timeField(body.due_time, { label: '시각' });
    if (dueTime.error !== undefined) return { error: dueTime.error };

    return { value: { name: name.value ?? '', due_date: dueDate.value, due_time: dueTime.value ?? null } };
};

// 접종 일정 추가 (반려동물이 본인 것인지 먼저 확인)
const addVaccination = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const checked = validateVaccination(req.body);
    if (checked.error !== undefined) return res.status(400).send({ message: checked.error });

    const pet_id = pathId(req.params.pet_id);
    try {
        const vaccinationId = pet_id === null ? null : await pets.addVaccination(pet_id, user_id, checked.value);
        if (vaccinationId === null) return res.status(404).send({ message: '본인의 반려동물에만 일정을 추가할 수 있습니다.' });
        return res.send({ message: '일정이 추가되었습니다.', vaccinationId });
    } catch (error) {
        logError('pets', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
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
const updateVaccination = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const checked = validateVaccination(req.body);
    if (checked.error !== undefined) return res.status(400).send({ message: checked.error });

    const vaccination_id = pathId(req.params.vaccination_id);
    try {
        const updated = vaccination_id !== null && (await pets.updateVaccination(vaccination_id, user_id, checked.value));
        if (!updated) return res.status(404).send({ message: '일정을 찾을 수 없습니다.' });
        return res.send({ message: '수정되었습니다.' });
    } catch (error) {
        logError('pets', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 접종 완료 처리 / 되돌리기
const setVaccinationDone = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const vaccination_id = pathId(req.params.vaccination_id);
    try {
        const saved = vaccination_id !== null && (await pets.setDone(vaccination_id, user_id, Boolean(req.body.done)));
        if (!saved) return res.status(404).send({ message: '일정을 찾을 수 없습니다.' });
        return res.send({ message: '저장되었습니다.' });
    } catch (error) {
        logError('pets', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 접종 일정 삭제
const deleteVaccination = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const vaccination_id = pathId(req.params.vaccination_id);
    try {
        const deleted = vaccination_id !== null && (await pets.removeVaccination(vaccination_id, user_id));
        if (!deleted) return res.status(404).send({ message: '일정을 찾을 수 없습니다.' });
        return res.send({ message: '삭제되었습니다.' });
    } catch (error) {
        logError('pets', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

export { getMyPets, addPet, updatePet, deletePet, addVaccination, updateVaccination, setVaccinationDone, deleteVaccination };
