import prisma from '../db/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { timestampToKst } from '../db/format.js';

/*
 * 후기 저장소. 컨트롤러(controller/review.ts)는 HTTP 만 다루고, 요약은 controller/reviewSummary.ts 가
 * 이 저장소의 함수를 씁니다.
 *
 * 돌려주는 모양은 mysql2 때의 응답과 같습니다(contract/golden.json 의 "시설 후기 1쪽").
 */

/** 목록 한 줄. 사진 자체는 빼고 장수만(image_count) — CLAUDE.md §2.5. */
interface ReviewRow {
    review_id: number;
    user_id: number | null;
    facility_id: number | null;
    rating: number | null;
    review_content: string | null;
    created_at: string | null;
    image_count: number;
}

/** 요약 프롬프트에 싣는 한 건(ai/reviewSummaryPrompt.ts 의 PromptReview). 작성자는 뺍니다. */
interface ReviewForPrompt {
    review_id: number;
    rating: number | null;
    review_content: string | null;
    created_at: string | null;
}

type CreateResult = 'created' | 'no-account' | 'no-such-facility';

/** JSON 컬럼에 넣을 값. 사진이 없으면 DB 의 NULL 입니다(Prisma 는 null 대신 DbNull 을 받습니다). */
const imagesValue = (images: string[] | null) => (images === null ? Prisma.DbNull : images);

/**
 * 시설별 후기 한 쪽과 총계.
 * JSON 배열의 길이는 Prisma 가 세지 못해 raw SQL 로 둡니다(마이페이지와 같은 이유).
 */
async function pageOfFacility(facilityId: number, take: number, skip: number): Promise<{ reviews: ReviewRow[]; total: number }> {
    const [rows, total] = await Promise.all([
        prisma.$queryRaw<Array<Omit<ReviewRow, 'created_at' | 'image_count'> & { created_at: Date | null; image_count: number | bigint }>>`
            SELECT review_id, user_id, facility_id, rating, review_content, created_at,
                   COALESCE(JSON_LENGTH(images), 0) AS image_count
              FROM reviews WHERE facility_id = ${facilityId} AND deleted_at IS NULL
             ORDER BY created_at DESC, review_id DESC LIMIT ${take} OFFSET ${skip}`,
        prisma.review.count({ where: { facility_id: facilityId, deleted_at: null } }),
    ]);
    return {
        reviews: rows.map((r) => ({ ...r, created_at: timestampToKst(r.created_at), image_count: Number(r.image_count) })),
        total,
    };
}

/** 후기 한 건의 사진. 없는 후기면 null, 사진이 없으면 []. */
async function imagesOf(reviewId: number): Promise<unknown[] | null> {
    const row = await prisma.review.findFirst({
        where: { review_id: reviewId, deleted_at: null },
        // select 로 고르면 전역 omit(db/prisma.ts)에 관계없이 그 칸을 읽습니다.
        select: { images: true },
    });
    if (!row) return null;
    return Array.isArray(row.images) ? row.images : [];
}

/** 살아 있는 후기 수. 요약을 만들지 말지(MIN_REVIEWS)와 낡았는지(review_count)를 이것으로 봅니다. */
async function countOfFacility(facilityId: number): Promise<number> {
    return prisma.review.count({ where: { facility_id: facilityId, deleted_at: null } });
}

/** 요약에 넣을 최신 후기. 작성자(user_id)는 고르지 않습니다 — 외부로 보내는 개인정보를 줄입니다. */
async function latestForPrompt(facilityId: number, take: number): Promise<ReviewForPrompt[]> {
    const rows = await prisma.review.findMany({
        where: { facility_id: facilityId, deleted_at: null },
        orderBy: [{ created_at: 'desc' }, { review_id: 'desc' }],
        take,
        select: { review_id: true, rating: true, review_content: true, created_at: true },
    });
    return rows.map((r) => ({ ...r, created_at: timestampToKst(r.created_at) }));
}

/** 지운 후기도 facility_id 는 남아 있습니다 — 요약을 다시 만들 자리를 찾는 데 씁니다. */
async function facilityOf(reviewId: number): Promise<number | null> {
    const row = await prisma.review.findUnique({ where: { review_id: reviewId }, select: { facility_id: true } });
    return row?.facility_id ?? null;
}

/**
 * 새 후기. 탈퇴한 계정의 남은 토큰으로 쓸 수 없게 같은 트랜잭션에서 계정을 먼저 봅니다(posts.ts 와 같음).
 * 없는 시설 번호는 외래 키 오류(P2003)로 옵니다.
 */
async function create(userId: number, facilityId: number, rating: number, content: string, images: string[] | null): Promise<CreateResult> {
    try {
        return await prisma.$transaction(async (tx) => {
            const alive = await tx.user.findFirst({ where: { user_id: userId, deleted_at: null }, select: { user_id: true } });
            if (!alive) return 'no-account';
            await tx.review.create({
                data: { user_id: userId, facility_id: facilityId, rating, review_content: content, images: imagesValue(images), created_at: new Date() },
                select: { review_id: true },
            });
            return 'created';
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return 'no-such-facility';
        throw error;
    }
}

/**
 * 작성자 본인만. images 가 undefined 면 사진은 건드리지 않고, null 이면 다 뺀 것입니다(§2.7).
 */
async function update(reviewId: number, userId: number, rating: number, content: string, images: string[] | null | undefined): Promise<boolean> {
    const { count } = await prisma.review.updateMany({
        where: { review_id: reviewId, user_id: userId, deleted_at: null },
        data: { rating, review_content: content, ...(images === undefined ? {} : { images: imagesValue(images) }) },
    });
    return count > 0;
}

/** 글·댓글과 같이 표시만 남깁니다(soft delete). 작성자 본인만. */
async function remove(reviewId: number, userId: number): Promise<boolean> {
    const { count } = await prisma.review.updateMany({
        where: { review_id: reviewId, user_id: userId, deleted_at: null },
        data: { deleted_at: new Date() },
    });
    return count > 0;
}

export { pageOfFacility, imagesOf, countOfFacility, latestForPrompt, facilityOf, create, update, remove };
export type { ReviewRow, ReviewForPrompt, CreateResult };
