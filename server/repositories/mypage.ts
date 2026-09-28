import prisma from '../db/prisma.js';
import { timestampToKst } from '../db/format.js';

/*
 * 마이페이지 저장소. 세 칸(내가 쓴 글 · 후기 · 댓글)의 최근 목록입니다.
 *
 * 돌려주는 모양은 mysql2 때의 응답과 같습니다(contract/golden.json 의 "내가 쓴 …").
 * 화면이 받는 타입은 client/src/types/post.type.ts 의 MyPost, review.type.ts 의 ReviewData 입니다.
 */

/** 마이페이지 칸 하나에 보여 줄 수. 최근 것만 보여 주는 자리입니다. */
const RECENT_LIMIT = 20;

interface MyPost {
    post_id: number;
    title: string;
    created_at: string | null;
}

interface MyReview {
    review_id: number;
    user_id: number | null;
    facility_id: number | null;
    rating: number | null;
    review_content: string | null;
    created_at: string | null;
    image_count: number;
}

interface MyComment {
    comment_id: number;
    post_id: number | null;
    content: string;
    created_at: string | null;
    post_title: string;
}

/**
 * 제목과 작성일만. 본문은 누르면 /posts/:id 에서 다시 받습니다 — 한 건에 2KB, 사진이 박힌
 * 글은 훨씬 커서 목록에 실을 것이 아닙니다.
 */
async function recentPosts(userId: number): Promise<MyPost[]> {
    const rows = await prisma.post.findMany({
        where: { user_id: userId, deleted_at: null },
        // created_at 은 초 단위라 같은 값이 흔합니다. 동점 처리가 없으면 스무 건 중 어느 것이 남을지 MySQL 이 보장하지 않습니다.
        orderBy: [{ created_at: 'desc' }, { post_id: 'desc' }],
        take: RECENT_LIMIT,
        select: { post_id: true, title: true, created_at: true },
    });
    return rows.map((r) => ({ ...r, created_at: timestampToKst(r.created_at) }));
}

/**
 * 사진은 빼고 장수만(image_count). 사진 두 장 붙은 후기 하나가 214KB 였습니다(CLAUDE.md §2.5).
 *
 * Prisma 는 JSON 배열의 길이를 세지 못해 raw SQL 로 둡니다. images 를 읽어 와서 세면
 * 사진이 전부 서버까지는 오므로 같은 값을 DB 에서 세는 것입니다.
 */
async function recentReviews(userId: number): Promise<MyReview[]> {
    const rows = await prisma.$queryRaw<
        Array<Omit<MyReview, 'created_at' | 'image_count'> & { created_at: Date | null; image_count: number | bigint }>
    >`
        SELECT review_id, user_id, facility_id, rating, review_content, created_at,
               COALESCE(JSON_LENGTH(images), 0) AS image_count
          FROM reviews WHERE user_id = ${userId} AND deleted_at IS NULL
         ORDER BY created_at DESC, review_id DESC LIMIT ${RECENT_LIMIT}`;
    return rows.map((r) => ({
        ...r,
        created_at: timestampToKst(r.created_at),
        // raw 결과의 정수 집계는 BIGINT 로 와서 BigInt 가 될 수 있습니다. JSON 으로 나가지 못합니다.
        image_count: Number(r.image_count),
    }));
}

/**
 * 내가 쓴 댓글에 글 제목을 붙입니다. 제목이 없으면 눌러 보기 전에는 무슨 얘기였는지 알 수 없습니다.
 * 글이 지워졌으면 댓글도 뺍니다 — 남겨 두면 눌렀을 때 갈 곳이 없습니다(INNER JOIN 이었던 자리).
 */
async function recentComments(userId: number): Promise<MyComment[]> {
    const rows = await prisma.comment.findMany({
        where: { user_id: userId, deleted_at: null, post: { is: { deleted_at: null } } },
        orderBy: [{ created_at: 'desc' }, { comment_id: 'desc' }],
        take: RECENT_LIMIT,
        select: { comment_id: true, post_id: true, content: true, created_at: true, post: { select: { title: true } } },
    });
    return rows.map(({ post, created_at, ...r }) => ({
        ...r,
        created_at: timestampToKst(created_at),
        // post 가 있는 것만 골랐으므로(위 where) null 이 아닙니다.
        post_title: post?.title ?? '',
    }));
}

export { recentPosts, recentReviews, recentComments, RECENT_LIMIT };
export type { MyPost, MyReview, MyComment };
