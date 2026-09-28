import prisma from '../db/prisma.js';
import { timestampToKst } from '../db/format.js';

/*
 * 시설별 후기 AI 요약 저장소. 만들고 읽는 흐름은 controller/reviewSummary.ts 에 있습니다.
 */

/** 후기 목록 응답에 실리는 요약 (controller/review.ts 의 getReviewsByFacilityId). */
interface ReviewSummaryView {
    summary: string;
    good: unknown[];
    caution: unknown[];
    review_count: number;
    updated_at: string | null;
}

interface SummaryInput {
    summary: string;
    good: string[];
    caution: string[];
    review_count: number;
    last_review_id: number;
    provider: string;
    model: string;
}

/** json 컬럼은 배열로 오지만, 손으로 넣은 값이 다른 모양일 수도 있어 배열이 아니면 빈 목록입니다. */
const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

async function read(facilityId: number): Promise<ReviewSummaryView | null> {
    const row = await prisma.reviewSummary.findUnique({
        where: { facility_id: facilityId },
        select: { summary: true, good: true, caution: true, review_count: true, updated_at: true },
    });
    if (!row) return null;
    return {
        summary: row.summary,
        good: asList(row.good),
        caution: asList(row.caution),
        review_count: row.review_count,
        updated_at: timestampToKst(row.updated_at),
    };
}

/** 있으면 덮어쓰고 없으면 넣습니다(mysql2 때의 INSERT … ON DUPLICATE KEY UPDATE). */
async function save(facilityId: number, input: SummaryInput): Promise<void> {
    const data = { ...input, updated_at: new Date() };
    await prisma.reviewSummary.upsert({
        where: { facility_id: facilityId },
        create: { facility_id: facilityId, ...data },
        update: data,
    });
}

/** 5건 아래로 내려가면 요약도 치웁니다. 없어도 오류가 아닙니다. */
async function remove(facilityId: number): Promise<void> {
    await prisma.reviewSummary.deleteMany({ where: { facility_id: facilityId } });
}

export { read, save, remove };
export type { ReviewSummaryView, SummaryInput };
