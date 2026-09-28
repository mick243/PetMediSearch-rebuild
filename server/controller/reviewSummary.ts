/*
 * 시설별 후기 AI 요약 — 만들기와 읽기.
 *
 * 만들기는 후기가 등록·수정·삭제된 뒤 뒤에서 돕니다. 사용자는 기다리지 않고, 다음에
 * 목록을 열 때 새 요약이 보입니다. 읽기는 목록 응답에 그대로 실려 나갑니다 —
 * 요청 하나가 더 나가지 않습니다.
 *
 * 어느 모델을 쓰는지는 여기서 모릅니다 (../ai/index.ts 가 고릅니다).
 *
 * 요약 때문에 후기 목록이 실패하는 일은 없어야 합니다. 요약 표가 없거나 모델이
 * 죽어도 목록은 summary: null 로 그대로 나갑니다.
 */
import prisma from '../db/prisma.js';
import { logError } from '../logError.js';
import * as ai from '../ai/index.js';
import { MIN_REVIEWS, MAX_REVIEWS_IN_PROMPT, SYSTEM_PROMPT, SUMMARY_SCHEMA, buildPrompt, parseSummary } from '../ai/reviewSummaryPrompt.js';
import * as reviews from '../repositories/reviews.js';
import * as summaries from '../repositories/reviewSummaries.js';
import type { ReviewSummaryView } from '../repositories/reviewSummaries.js';

export type { ReviewSummaryView };

/*
 * 시설별로 한 번에 하나만 돕니다. 도는 중에 또 요청이 오면 표시만 해 두고, 끝난 뒤
 * 한 번 더 돕니다. 후기 세 건이 연달아 와도 모델 호출은 두 번입니다.
 * 프로세스 안의 표시라 인스턴스를 여러 개 띄우면 각자 돕니다 — 결과가 같은 행에
 * 덮어써질 뿐 틀리지는 않습니다.
 */
const inFlight = new Map<number, { again: boolean }>();

const rebuild = async (facilityId: number) => {
    const total = await reviews.countOfFacility(facilityId);

    // 5건 아래로 내려갔으면 요약도 치웁니다. 한두 사람의 글이 전체 인상이 되면 안 됩니다.
    if (total < MIN_REVIEWS) {
        await summaries.remove(facilityId);
        return;
    }

    // 최신 순으로 상한까지만 봅니다 — 상한의 이유는 reviewSummaryPrompt.ts 에.
    const rows = await reviews.latestForPrompt(facilityId, MAX_REVIEWS_IN_PROMPT);
    const facility = await prisma.medicalFacility.findUnique({ where: { id: facilityId }, select: { bplcnm: true } });

    const provider = ai.getProvider();
    const { text, model } = await provider.generateJson({
        system: SYSTEM_PROMPT,
        user: buildPrompt(rows, { facilityName: facility?.bplcnm ?? '', total }),
        schema: SUMMARY_SCHEMA,
        maxOutputTokens: 1024,
    });

    // 읽을 수 없는 답이면 이전 요약을 그대로 둡니다. 깨진 글보다 낡은 글이 낫습니다.
    const parsed = parseSummary(text);
    if (!parsed) throw new Error('요약 응답을 형식대로 읽지 못했습니다.');

    await summaries.save(facilityId, {
        summary: parsed.summary,
        good: parsed.good,
        caution: parsed.caution,
        review_count: total,
        last_review_id: Math.max(...rows.map((r) => r.review_id)),
        provider: provider.name,
        model: String(model).slice(0, 80),
    });
};

/**
 * 그 시설의 요약을 뒤에서 다시 만듭니다. 바로 돌아옵니다.
 * 키가 없으면(요약 기능이 꺼져 있으면) 아무것도 하지 않습니다.
 */
const refreshSummary = (facilityId: unknown) => {
    const id = Number(facilityId);
    if (!Number.isInteger(id) || id <= 0) return;
    if (!ai.isEnabled()) return;

    const state = inFlight.get(id);
    if (state) {
        state.again = true;
        return;
    }
    inFlight.set(id, { again: false });

    rebuild(id)
        .catch((error) => logError('reviewSummary:rebuild', error))
        .finally(() => {
            const done = inFlight.get(id);
            inFlight.delete(id);
            if (done?.again) refreshSummary(id);
        });
};

/** 후기 번호만 아는 자리(수정·삭제)에서 부릅니다. 지운 글도 facility_id 는 남아 있습니다. */
const refreshForReview = (reviewId: number) => {
    if (!ai.isEnabled()) return;
    reviews.facilityOf(reviewId)
        .then((facilityId) => { if (facilityId) refreshSummary(facilityId); })
        .catch((error) => logError('reviewSummary:lookup', error));
};

/**
 * 목록 응답에 실을 요약. 없으면 null. 오류가 나도 null 입니다.
 *
 * @param total 지금 살아 있는 후기 수. 저장된 review_count 와 다르면 낡은 것이라 뒤에서
 *   다시 만들고, 이번 응답에는 있는 것을 그대로 실습니다.
 */
const getSummary = async (facilityId: number, total: number): Promise<ReviewSummaryView | null> => {
    if (total < MIN_REVIEWS) return null;
    try {
        const row = await summaries.read(facilityId);
        if (!row || row.review_count !== total) refreshSummary(facilityId);
        return row;
    } catch (error) {
        // 표가 없어도(마이그레이션 전) 목록은 나가야 합니다.
        logError('reviewSummary:read', error);
        return null;
    }
};

export { refreshSummary, refreshForReview, getSummary };
