import prisma from '../db/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { boolToInt, dateToString, decimalToString, timeToString, timestampToKst } from '../db/format.js';

/*
 * 반려동물 · 접종 일정 저장소. 컨트롤러(controller/pets.ts)는 HTTP 만 다룹니다.
 *
 * 돌려주는 모양은 mysql2 때의 응답과 같습니다(contract/golden.json 의 "반려동물"):
 * 생일 'YYYY-MM-DD', 몸무게 '3.20', 예약 시각 'HH:MM:SS', 완료 0/1.
 */

interface VaccinationRow {
    vaccination_id: number;
    pet_id: number;
    name: string;
    due_date: string | null;
    due_time: string | null;
    done: 0 | 1 | null;
}

interface PetRow {
    pet_id: number;
    user_id: number;
    name: string;
    category_id: number | null;
    category_name: string | null;
    breed: string | null;
    birth_date: string | null;
    weight_kg: string | null;
    photo: string | null;
    created_at: string | null;
    vaccinations: VaccinationRow[];
}

/** 검사를 마친 입력(controller/pets.ts 의 validatePet). 날짜는 'YYYY-MM-DD' 문자열입니다. */
interface PetInput {
    name: string;
    breed: string | null;
    birth_date: string | null;
    weight_kg: number | null;
    category_id: number | null;
    photo: string | null;
}

interface VaccinationInput {
    name: string;
    due_date: string;
    /** 'HH:MM:SS' 또는 null. */
    due_time: string | null;
}

type WriteResult = 'ok' | 'no-such-category';

/*
 * DATE · TIME 컬럼에 넣는 값. 어댑터 세션이 UTC 라(db/prisma.ts) UTC 자정 · 1970-01-01 의
 * UTC 시각으로 만들면 DB 에는 날짜 · 시각 부분만 그대로 들어갑니다(db/format.ts 의 읽기와 대칭).
 */
const dateValue = (ymd: string | null) => (ymd === null ? null : new Date(`${ymd}T00:00:00Z`));
const timeValue = (hms: string | null) => (hms === null ? null : new Date(`1970-01-01T${hms}Z`));

const isMissingCategory = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';

const toVaccination = (v: { vaccination_id: number; pet_id: number; name: string; due_date: Date; due_time: Date | null; done: boolean }): VaccinationRow => ({
    vaccination_id: v.vaccination_id,
    pet_id: v.pet_id,
    name: v.name,
    due_date: dateToString(v.due_date),
    due_time: timeToString(v.due_time),
    done: boolToInt(v.done),
});

/**
 * 내 반려동물과 각자의 접종 일정.
 *
 * 일정은 날짜순, 같은 날이면 시각이 있는 것을 먼저(mysql2 때의 `due_time IS NULL, due_time`).
 * Prisma 의 orderBy 는 MySQL 에서 NULL 을 앞에 두므로 그 부분만 여기서 정렬합니다.
 */
async function listMine(userId: number): Promise<PetRow[]> {
    const rows = await prisma.pet.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'asc' },
        select: {
            pet_id: true, user_id: true, name: true, category_id: true, breed: true, birth_date: true,
            weight_kg: true, photo: true, created_at: true,
            category: { select: { category_name: true } },
            vaccinations: { orderBy: [{ due_date: 'asc' }, { vaccination_id: 'asc' }] },
        },
    });
    return rows.map(({ category, vaccinations, ...p }) => ({
        pet_id: p.pet_id,
        user_id: p.user_id,
        name: p.name,
        category_id: p.category_id,
        category_name: category?.category_name ?? null,
        breed: p.breed,
        birth_date: dateToString(p.birth_date),
        weight_kg: decimalToString(p.weight_kg, 2),
        photo: p.photo,
        created_at: timestampToKst(p.created_at),
        vaccinations: vaccinations
            .map(toVaccination)
            // 안정 정렬이라 날짜순은 그대로 두고, 같은 날 안에서 시각 없는 것만 뒤로 보냅니다.
            .sort((a, b) => (a.due_date === b.due_date ? Number(a.due_time === null) - Number(b.due_time === null) : 0)),
    }));
}

async function create(userId: number, input: PetInput): Promise<{ petId: number } | 'no-such-category'> {
    try {
        const row = await prisma.pet.create({
            data: { ...input, user_id: userId, birth_date: dateValue(input.birth_date) },
            select: { pet_id: true },
        });
        return { petId: row.pet_id };
    } catch (error) {
        if (isMissingCategory(error)) return 'no-such-category';
        throw error;
    }
}

/** 본인 것만. 바뀐 행이 없으면 'not-mine'(없는 것과 남의 것을 가르지 않습니다). */
async function update(petId: number, userId: number, input: PetInput): Promise<WriteResult | 'not-mine'> {
    try {
        const { count } = await prisma.pet.updateMany({
            where: { pet_id: petId, user_id: userId },
            data: { ...input, birth_date: dateValue(input.birth_date) },
        });
        return count > 0 ? 'ok' : 'not-mine';
    } catch (error) {
        if (isMissingCategory(error)) return 'no-such-category';
        throw error;
    }
}

/** 접종 일정은 FK(ON DELETE CASCADE)가 함께 지웁니다. */
async function remove(petId: number, userId: number): Promise<boolean> {
    const { count } = await prisma.pet.deleteMany({ where: { pet_id: petId, user_id: userId } });
    return count > 0;
}

/** 반려동물이 본인 것인지 같은 트랜잭션에서 먼저 봅니다. 아니면 null. */
async function addVaccination(petId: number, userId: number, input: VaccinationInput): Promise<number | null> {
    return prisma.$transaction(async (tx) => {
        const mine = await tx.pet.findFirst({ where: { pet_id: petId, user_id: userId }, select: { pet_id: true } });
        if (!mine) return null;
        const row = await tx.petVaccination.create({
            data: { pet_id: petId, name: input.name, due_date: dateValue(input.due_date) as Date, due_time: timeValue(input.due_time) },
            select: { vaccination_id: true },
        });
        return row.vaccination_id;
    });
}

/** done 은 건드리지 않습니다 — 체크는 목록의 별도 조작이라 수정 화면이 덮어쓰면 완료가 풀립니다. */
async function updateVaccination(vaccinationId: number, userId: number, input: VaccinationInput): Promise<boolean> {
    const { count } = await prisma.petVaccination.updateMany({
        where: { vaccination_id: vaccinationId, pet: { is: { user_id: userId } } },
        data: { name: input.name, due_date: dateValue(input.due_date) as Date, due_time: timeValue(input.due_time) },
    });
    return count > 0;
}

async function setDone(vaccinationId: number, userId: number, done: boolean): Promise<boolean> {
    const { count } = await prisma.petVaccination.updateMany({
        where: { vaccination_id: vaccinationId, pet: { is: { user_id: userId } } },
        data: { done },
    });
    return count > 0;
}

async function removeVaccination(vaccinationId: number, userId: number): Promise<boolean> {
    const { count } = await prisma.petVaccination.deleteMany({
        where: { vaccination_id: vaccinationId, pet: { is: { user_id: userId } } },
    });
    return count > 0;
}

/** 함수를 객체 하나로 묶어 내보냅니다. 테스트가 t.mock.method 로 한 함수씩 바꿔 끼울 수 있습니다(ESM 이름 내보내기는 바꿀 수 없음). */
const pets = { listMine, create, update, remove, addVaccination, updateVaccination, setDone, removeVaccination };

export default pets;
export type { PetRow, VaccinationRow, PetInput, VaccinationInput };
