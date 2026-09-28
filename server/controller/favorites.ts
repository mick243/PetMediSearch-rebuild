import { logError } from '../logError.js';
import { requireUser } from './authUser.js';
import { pathId } from './validate.js';
import * as favorites from '../repositories/favorites.js';
import type { Request, Response } from 'express';

/*
 * 즐겨찾기. DB 는 repositories/favorites.ts 가 만지고 여기는 토큰 · 경로 · 응답만 다룹니다.
 * Prisma 로 옮긴 첫 모듈입니다 — 응답은 mysql2 때와 같습니다(contract/golden.json).
 * 경로의 시설 번호가 정수가 아니면 mysql2 때와 같게 — 넣기는 404, 빼기는 성공입니다.
 */

// 즐겨찾기한 병원·약국 목록 (시설 정보 포함)
const getFavorites = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    try {
        return res.send(await favorites.listFavorites(user_id));
    } catch (error) {
        logError('favorites', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

/*
 * 즐겨찾기 추가. 이미 있으면 그대로 성공 처리합니다(같은 별을 두 번 눌러도 오류가 아닙니다).
 *
 * 예전에는 INSERT IGNORE 였습니다. IGNORE 는 중복만이 아니라 **외래 키 오류까지** 경고로
 * 낮춰서, 없는 시설 번호를 보내도 성공으로 답하고 목록은 비어 있었습니다. 지금은 중복만
 * 성공으로 받고 없는 시설은 404 입니다(repositories/favorites.ts 의 addFavorite).
 */
const addFavorite = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const facility_id = pathId(req.params.facility_id);
    if (facility_id === null) return res.status(404).send({ message: '해당 시설을 찾을 수 없습니다.' });

    try {
        const result = await favorites.addFavorite(user_id, facility_id);
        if (result === 'no-such-facility') return res.status(404).send({ message: '해당 시설을 찾을 수 없습니다.' });
        return res.send({ message: '즐겨찾기에 추가했습니다.' });
    } catch (error) {
        logError('favorites', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

// 즐겨찾기 해제
const removeFavorite = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const facility_id = pathId(req.params.facility_id);
    try {
        if (facility_id !== null) await favorites.removeFavorite(user_id, facility_id);
        return res.send({ message: '즐겨찾기에서 뺐습니다.' });
    } catch (error) {
        logError('favorites', error);
        return res.status(500).send({ message: '서버 에러 발생' });
    }
};

export { getFavorites, addFavorite, removeFavorite };
