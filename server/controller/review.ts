import { logError } from '../logError.js';
import { requireUser } from './authUser.js';
import { textField, intField, idField, pathId, pageWindow, isImageDataUrl } from './validate.js';
import { refreshSummary, refreshForReview, getSummary } from './reviewSummary.js';
import * as reviews from '../repositories/reviews.js';
import type { Request, Response } from 'express';

/*
 * 후기. DB 는 repositories/reviews.ts 가 만지고 여기는 토큰 · 검사 · 응답만 다룹니다.
 *
 * 붙임 사진은 브라우저에서 줄인 JPEG 를 data URL 로 받습니다 (pets.photo 와 같은 방식).
 * 한 장 한 장의 규칙은 validate.ts 의 isImageDataUrl 에 있고, 반려동물 사진도 같은 것을 씁니다.
 */

/** 한 후기에 붙일 수 있는 장수. 본문 상한(app.ts 의 3mb)과 보기 좋은 수를 함께 본 값입니다. */
const MAX_IMAGES = 5;

/**
 * 저장할 사진 목록(없으면 null)을 돌려주고, 값이 이상하면 false 를 돌려줍니다.
 * 화면은 늘 목록 전체를 보내므로, 여기서 받은 것이 곧 저장될 전부입니다.
 */
const normalizeImages = (value: unknown): string[] | null | false => {
    if (value === undefined || value === null) return null;
    if (!Array.isArray(value)) return false;

    const kept = value.filter((v) => v !== null && v !== undefined && v !== '');
    if (kept.length === 0) return null;
    if (kept.length > MAX_IMAGES) return false;

    if (!kept.every(isImageDataUrl)) return false;
    return kept;
};

/**
 * 후기 본문 길이 상한.
 * reviews.review_content 는 text 이고 사진은 images 칸에 따로 들어갑니다.
 * 본문은 평문이라 칸을 넓히는 대신 입력을 제한합니다.
 */
const MAX_CONTENT_LENGTH = 2000;

/** 한 번에 보낼 후기 수. 화면의 쪽 크기와 맞춰 둡니다. */
const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 20;

/**
 * 시설별 후기. 페이지 단위로 끊어 보냅니다.
 *
 * 예전에는 그 시설의 후기를 전부 내려주고 화면에서 5건씩 잘라 썼습니다.
 * 후기에 사진이 붙으면서, 후기가 몰린 병원 한 곳이 14MB 가 됐습니다.
 * 사진은 한 장에 100KB 가 넘으므로 건수를 줄이는 것 말고 답이 없습니다.
 * 사진 자체는 빼고 장수만 보냅니다 — 펼칠 때 /reviews/:id/images 로 그 글 것만 받아갑니다.
 */
const getReviewsByFacilityId = async (req: Request, res: Response) => {
    const facility_id = pathId(req.params.facility_id);
    const { take, skip } = pageWindow(req.query, { defaultSize: DEFAULT_PAGE_SIZE, maxSize: MAX_PAGE_SIZE });
    try {
        // 후기가 없는 것은 오류가 아닙니다. 예전에는 404 라서 화면이 콘솔에 에러를 찍었습니다.
        if (facility_id === null) return res.send({ reviews: [], total: 0, summary: null });
        const page = await reviews.pageOfFacility(facility_id, take, skip);
        /*
         * AI 요약을 같이 실어 보냅니다. 후기 5건 미만이거나 아직 안 만들어졌으면 null.
         * 요청 하나를 더 받는 대신 여기에 싣는 이유: 요약은 이 목록을 보는 사람만
         * 보고, 저장된 행 하나를 읽는 것이라 목록 쿼리에 비하면 비용이 없습니다.
         */
        const summary = await getSummary(facility_id, page.total);
        return res.send({ ...page, summary });
    } catch (error) {
        logError('review:list', error);
        return res.status(500).send({ message: '서버 오류 발생' });
    }
};

/** 후기 한 건의 사진. 목록에서 뺐으므로 펼칠 때 여기서 받아갑니다. */
const getReviewImages = async (req: Request, res: Response) => {
    const review_id = pathId(req.params.review_id);
    try {
        const images = review_id === null ? null : await reviews.imagesOf(review_id);
        if (images === null) return res.status(404).send({ message: '후기를 찾을 수 없습니다.' });
        return res.send({ images });
    } catch (error) {
        logError('review:images', error);
        return res.status(500).send({ message: '서버 오류 발생' });
    }
};

// 리뷰 등록
const createReview = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    // 이 번호는 INSERT 뿐 아니라 뒤의 요약 갱신(refreshSummary)에도 그대로 넘어갑니다.
    const facility = idField(req.body.facility_id, { label: '시설' });
    if (facility.error !== undefined || facility.value === null) return res.status(400).send({ message: facility.error ?? '어느 시설인지 알 수 없습니다.' });

    const score = intField(req.body.rating, { label: '평점', min: 1, max: 5 });
    if (score.error !== undefined || score.value === null) return res.status(400).send({ message: score.error ?? '평점을 입력해주세요.' });

    const body = textField(req.body.review_content, { label: '후기', max: MAX_CONTENT_LENGTH });
    if (body.error !== undefined) return res.status(400).send({ message: body.error });

    const photos = normalizeImages(req.body.images);
    if (photos === false) return res.status(400).send({ message: '사진을 읽을 수 없습니다.' });

    try {
        const result = await reviews.create(user_id, facility.value, score.value, body.value ?? '', photos);
        if (result === 'no-account') return res.status(401).send({ message: '사용할 수 없는 계정입니다.' });
        // 형식은 맞지만 없는 시설 번호(외래 키). favorites.ts 와 같은 답입니다.
        if (result === 'no-such-facility') return res.status(404).send({ message: '해당 시설을 찾을 수 없습니다.' });
        // 요약은 응답을 보낸 뒤 뒤에서 다시 만듭니다. 쓰는 사람이 모델을 기다리지 않습니다.
        refreshSummary(facility.value);
        return res.status(201).send({ message: '리뷰가 성공적으로 등록되었습니다' });
    } catch (error) {
        logError('review', error);
        return res.status(500).send({ message: '서버 오류 발생' });
    }
};

// 리뷰 수정
const updateReview = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const score = intField(req.body.rating, { label: '평점', min: 1, max: 5 });
    if (score.error !== undefined || score.value === null) return res.status(400).send({ message: score.error ?? '평점을 입력해주세요.' });

    const body = textField(req.body.review_content, { label: '후기', max: MAX_CONTENT_LENGTH });
    if (body.error !== undefined) return res.status(400).send({ message: body.error });

    /*
     * images 를 아예 보내지 않으면 사진은 건드리지 않고, 빈 배열을 보내면 다 뺐다는 뜻입니다.
     * 둘을 구분하지 않으면, 사진을 다룰 줄 모르는 화면이 수정 한 번에 사진을 날립니다.
     */
    const photos = req.body.images === undefined ? undefined : normalizeImages(req.body.images);
    if (photos === false) return res.status(400).send({ message: '사진을 읽을 수 없습니다.' });

    const review_id = pathId(req.params.review_id);
    try {
        const updated = review_id !== null && (await reviews.update(review_id, user_id, score.value, body.value ?? '', photos));
        if (!updated) return res.status(404).send({ message: '작성자만 수정할 수 있습니다.' });
        refreshForReview(review_id as number);
        return res.send({ message: '리뷰가 수정되었습니다.' });
    } catch (error) {
        logError('review', error);
        return res.status(500).send({ message: '서버 오류 발생' });
    }
};

// 리뷰 삭제
const deleteReview = async (req: Request, res: Response) => {
    const user_id = requireUser(req, res);
    if (!user_id) return;

    const review_id = pathId(req.params.review_id);
    try {
        /*
         * 글·댓글과 같이 표시만 남깁니다(soft delete).
         * 예전에는 DELETE 라서 잘못 지우면 되돌릴 방법이 없었고, 탈퇴할 때 후기만
         * 영영 사라져 다른 글과 처리가 달랐습니다.
         */
        const deleted = review_id !== null && (await reviews.remove(review_id, user_id));
        if (!deleted) return res.status(404).send({ message: '작성자만 삭제할 수 있습니다.' });
        // 5건 아래로 내려가면 요약 행도 치워집니다 (reviewSummary.ts).
        refreshForReview(review_id as number);
        return res.status(200).send({ message: '리뷰가 삭제되었습니다.' });
    } catch (error) {
        logError('review', error);
        return res.status(500).send({ message: '서버 오류 발생' });
    }
};

export { getReviewsByFacilityId, getReviewImages, createReview, updateReview, deleteReview };
