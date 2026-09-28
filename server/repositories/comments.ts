import prisma from '../db/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { timestampToKst } from '../db/format.js';

/*
 * 댓글 저장소. 컨트롤러(controller/comment.ts)는 HTTP 만 다룹니다.
 *
 * 스레드(답글의 답글까지)를 모으는 재귀 CTE 는 Prisma 가 표현하지 못해 raw SQL 로 둡니다.
 * 돌려주는 모양은 mysql2 때의 응답과 같습니다(contract/golden.json 의 "댓글 1쪽").
 */

interface CommentRow {
    comment_id: number;
    user_id: number | null;
    content: string;
    created_at: string | null;
    author: string;
    parent_comment_id: number | null;
}

interface CommentPage {
    comments: CommentRow[];
    /** 스레드(원댓글) 수. 쪽 번호를 그리는 데 씁니다. */
    total: number;
    /** 이 글의 전체 댓글 수. 머리말의 "댓글 N개" 입니다. */
    count: number;
}

type CreateResult = { commentId: number } | 'no-account' | 'no-such-target';
type DeleteResult = { deletedCount: number } | 'forbidden';

/*
 * "원댓글" 의 조건.
 *
 * parent_comment_id 가 없는 것뿐 아니라 부모가 지워진 답글도 포함합니다.
 * 지우면 행은 남고 조회에서만 빠지므로(soft delete) 답글의 parent_comment_id 는
 * 그대로인데, 화면은 그런 답글을 원댓글 자리로 올려 그립니다
 * (client/src/comment/CommentSection.tsx 의 isRoot). 여기서 같은 기준을 쓰지 않으면
 * 그 답글이 어느 쪽에도 안 실려 영영 안 보이게 됩니다.
 */
const rootSource = (postId: number) => Prisma.sql`
        FROM comments c
        LEFT JOIN comments p ON p.comment_id = c.parent_comment_id AND p.deleted_at IS NULL
        WHERE c.post_id = ${postId} AND c.deleted_at IS NULL
          AND (c.parent_comment_id IS NULL OR p.comment_id IS NULL)`;

/**
 * 글의 댓글. 스레드 단위로 쪽을 나눕니다.
 *
 * 댓글을 줄 단위로 자르면 답글이 부모와 떨어져 화면에서 사라집니다.
 * 이 쪽에 보일 원댓글을 먼저 고르고, 그 아래 답글을 깊이에 상관없이 딸려 보냅니다.
 */
async function pageOfPost(postId: number, take: number, skip: number): Promise<CommentPage> {
    // raw 결과의 COUNT 는 BigInt 로 옵니다. JSON 으로 나가지 못하니 Number 로 바꿉니다.
    const [counts] = await prisma.$queryRaw<Array<{ total: bigint | number; count: bigint | number }>>`
        SELECT (SELECT COUNT(*) ${rootSource(postId)}) AS total,
               (SELECT COUNT(*) FROM comments WHERE post_id = ${postId} AND deleted_at IS NULL) AS count`;
    const total = Number(counts?.total ?? 0);
    const count = Number(counts?.count ?? 0);

    const roots = await prisma.$queryRaw<Array<{ comment_id: number }>>`
        SELECT c.comment_id ${rootSource(postId)} ORDER BY c.created_at ASC, c.comment_id ASC LIMIT ${take} OFFSET ${skip}`;
    if (roots.length === 0) return { comments: [], total, count };

    // 고른 원댓글에서 시작해 답글의 답글까지 따라 내려갑니다.
    const rows = await prisma.$queryRaw<Array<Omit<CommentRow, 'created_at'> & { created_at: Date | null }>>`
        WITH RECURSIVE thread AS (
            SELECT comment_id FROM comments WHERE comment_id IN (${Prisma.join(roots.map((r) => r.comment_id))})
            UNION ALL
            SELECT c.comment_id
              FROM comments c
              JOIN thread t ON c.parent_comment_id = t.comment_id
             WHERE c.deleted_at IS NULL
        )
        SELECT c.comment_id, c.user_id, c.content, c.created_at,
               u.username AS author, c.parent_comment_id
          FROM comments c
          JOIN users u ON c.user_id = u.user_id
         WHERE c.comment_id IN (SELECT comment_id FROM thread)
         ORDER BY c.created_at ASC, c.comment_id ASC`;

    return { comments: rows.map((r) => ({ ...r, created_at: timestampToKst(r.created_at) })), total, count };
}

/**
 * 새 댓글. 탈퇴한 계정의 남은 토큰으로 달 수 없게 같은 트랜잭션에서 계정을 먼저 봅니다(posts.ts 와 같음).
 * 없는 글이나 원댓글 번호는 외래 키 오류(P2003)로 옵니다.
 */
async function create(userId: number, postId: number, parentId: number | null, content: string): Promise<CreateResult> {
    try {
        return await prisma.$transaction(async (tx) => {
            const alive = await tx.user.findFirst({ where: { user_id: userId, deleted_at: null }, select: { user_id: true } });
            if (!alive) return 'no-account';
            const row = await tx.comment.create({
                data: { post_id: postId, user_id: userId, content, parent_comment_id: parentId, created_at: new Date() },
                select: { comment_id: true },
            });
            return { commentId: row.comment_id };
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return 'no-such-target';
        throw error;
    }
}

/** 작성자 본인만. 고친 시각을 created_at 에 씁니다(mysql2 때와 같음 — updated_at 컬럼이 없습니다). */
async function update(commentId: number, userId: number, content: string): Promise<boolean> {
    const { count } = await prisma.comment.updateMany({
        where: { comment_id: commentId, user_id: userId, deleted_at: null },
        data: { content, created_at: new Date() },
    });
    return count > 0;
}

/**
 * 댓글 삭제(soft delete).
 *
 * 작성자 본인이면 그 댓글 하나만 표시합니다 — 남이 단 답글이 내 댓글을 지운다고 함께 사라지면
 * 곤란합니다. 부모가 사라진 답글은 화면이 원댓글 자리로 올려 그립니다.
 * 관리자는 스레드를 통째로 정리하는 쪽이라 답글을 끝까지 따라갑니다(재귀 CTE).
 *
 * 없는 댓글과 남의 댓글은 같은 답('forbidden')입니다. 갈라 알려 주면 남의 글 존재 여부가 새어 나갑니다.
 */
async function remove(commentId: number, userId: number): Promise<DeleteResult> {
    return prisma.$transaction(async (tx) => {
        const [target, me] = await Promise.all([
            tx.comment.findFirst({ where: { comment_id: commentId, deleted_at: null }, select: { user_id: true } }),
            tx.user.findUnique({ where: { user_id: userId }, select: { role: true } }),
        ]);
        const isAdmin = me?.role === 'admin';
        if (!target || (target.user_id !== userId && !isAdmin)) return 'forbidden';

        const deletedAt = new Date();
        if (!isAdmin) {
            const { count } = await tx.comment.updateMany({
                where: { comment_id: commentId, deleted_at: null },
                data: { deleted_at: deletedAt },
            });
            return { deletedCount: count };
        }

        const thread = await tx.$queryRaw<Array<{ comment_id: number }>>`
            WITH RECURSIVE thread AS (
              SELECT comment_id FROM comments WHERE comment_id = ${commentId} AND deleted_at IS NULL
              UNION ALL
              SELECT c.comment_id FROM comments c JOIN thread t ON c.parent_comment_id = t.comment_id
               WHERE c.deleted_at IS NULL
            )
            SELECT comment_id FROM thread`;
        const { count } = await tx.comment.updateMany({
            where: { comment_id: { in: thread.map((r) => r.comment_id) }, deleted_at: null },
            data: { deleted_at: deletedAt },
        });
        return { deletedCount: count };
    });
}

export { pageOfPost, create, update, remove };
export type { CommentRow, CommentPage, CreateResult, DeleteResult };
