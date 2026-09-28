import prisma from '../db/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { timestampToKst } from '../db/format.js';

/*
 * 글 · 분류 저장소. 컨트롤러(controller/post.ts · category.ts)는 HTTP 만 다룹니다.
 *
 * 돌려주는 모양은 mysql2 때의 응답과 같습니다(contract/golden.json 의 "글 상세" · "통합 목록").
 * 키 이름 · 순서 · 타입을 바꾸면 기준선이 깨집니다 — 일부러 바꾸는 단계(5단계)에서만 바꿉니다.
 */

interface CategoryRow {
    category_id: number;
    category_name: string;
}

/** 목록 한 줄. 본문(content)이 그대로 실립니다 — 화면이 미리보기와 대표 이미지를 본문에서 뽑습니다. */
interface PostListRow {
    post_id: number;
    title: string;
    content: string;
    created_at: string | null;
    username: string;
    category_id: number | null;
    category_name: string | null;
}

/** 글 상세. user_id 는 화면에서 작성자에게만 수정·삭제 버튼을 보이기 위해 함께 내려줍니다. */
interface PostRow {
    post_id: number;
    user_id: number | null;
    category_id: number | null;
    title: string;
    content: string;
    created_at: string | null;
    author: string;
}

type CreateResult = { postId: number } | 'no-account' | 'no-such-category';

async function listCategories(): Promise<CategoryRow[]> {
    return prisma.category.findMany({ orderBy: { category_id: 'asc' } });
}

/**
 * 분류별 글 목록과 총계. categoryId 가 null 이면 전체('통합')입니다.
 *
 * 작성자 행이 없는 글(user_id NULL)은 목록에서 빠지지만 총계에는 듭니다 — mysql2 때 목록은
 * INNER JOIN 이고 총계는 posts 만 셌기 때문입니다. 응답을 바꾸지 않는 단계라 그대로 둡니다.
 */
async function listPosts(categoryId: number | null, take: number, skip: number): Promise<{ posts: PostListRow[]; total: number }> {
    const where: Prisma.PostWhereInput = { deleted_at: null, ...(categoryId === null ? {} : { category_id: categoryId }) };
    const [rows, total] = await Promise.all([
        prisma.post.findMany({
            where: { ...where, user_id: { not: null } },
            orderBy: [{ created_at: 'desc' }, { post_id: 'desc' }],
            take,
            skip,
            select: {
                post_id: true, title: true, content: true, created_at: true,
                user: { select: { username: true } },
                category: { select: { category_id: true, category_name: true } },
            },
        }),
        // 총계는 화면의 쪽 번호에 필요합니다. 목록과 달리 본문을 읽지 않아 가볍습니다.
        prisma.post.count({ where }),
    ]);
    return {
        posts: rows.map(({ user, category, created_at, ...r }) => ({
            ...r,
            created_at: timestampToKst(created_at),
            username: user?.username ?? '',
            category_id: category?.category_id ?? null,
            category_name: category?.category_name ?? null,
        })),
        total,
    };
}

async function getPost(postId: number): Promise<PostRow | null> {
    const row = await prisma.post.findFirst({
        where: { post_id: postId, deleted_at: null, user_id: { not: null } },
        select: {
            post_id: true, user_id: true, category_id: true, title: true, content: true, created_at: true,
            user: { select: { username: true } },
        },
    });
    if (!row) return null;
    const { user, created_at, ...r } = row;
    return { ...r, created_at: timestampToKst(created_at), author: user?.username ?? '' };
}

/**
 * 새 글. 탈퇴한 계정의 남은 토큰(하루짜리)으로 쓸 수 없게, 같은 트랜잭션에서 계정이 살아 있는지
 * 먼저 봅니다(mysql2 때는 INSERT … SELECT FROM users 한 문장이었습니다).
 * 없는 분류 번호는 외래 키 오류(P2003)로 옵니다.
 */
async function createPost(userId: number, categoryId: number, title: string, content: string): Promise<CreateResult> {
    try {
        return await prisma.$transaction(async (tx) => {
            const alive = await tx.user.findFirst({ where: { user_id: userId, deleted_at: null }, select: { user_id: true } });
            if (!alive) return 'no-account';
            const now = new Date();
            const post = await tx.post.create({
                data: { category_id: categoryId, user_id: userId, title, content, created_at: now, updated_at: now },
                select: { post_id: true },
            });
            return { postId: post.post_id };
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return 'no-such-category';
        throw error;
    }
}

/** 작성자 본인만. 바뀐 행이 없으면 false — 없는 글인지 남의 글인지는 가르지 않습니다. */
async function updatePost(postId: number, userId: number, title: string, content: string): Promise<boolean> {
    const { count } = await prisma.post.updateMany({
        where: { post_id: postId, user_id: userId, deleted_at: null },
        data: { title, content, updated_at: new Date() },
    });
    return count > 0;
}

/**
 * 글 삭제(soft delete). 작성자 본인이거나 관리자면 지웁니다.
 *
 * 관리자 여부는 토큰이 아니라 users 를 다시 봅니다 — 토큰이 하루짜리라 권한을 거둬들여도 남은
 * 토큰으로 계속 지울 수 있으면 안 됩니다(CLAUDE.md §2.2).
 *
 * 댓글도 같은 시각으로 함께 표시합니다. FK 의 CASCADE 는 표시만 남기는 방식에서는 걸리지 않습니다.
 * 이미 지워져 있던 댓글은 건드리지 않아, 글을 되살려도 그대로 지워진 채 남습니다.
 * 글과 댓글이 같은 deleted_at 을 갖도록 한 트랜잭션에서 같은 값을 씁니다 — 그래야 "이 글과
 * 같이 지워진 댓글" 을 시각으로 골라 되살릴 수 있습니다.
 */
async function deletePost(postId: number, userId: number): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
        const me = await tx.user.findUnique({ where: { user_id: userId }, select: { role: true } });
        const isAdmin = me?.role === 'admin';
        const deletedAt = new Date();
        const { count } = await tx.post.updateMany({
            where: { post_id: postId, deleted_at: null, ...(isAdmin ? {} : { user_id: userId }) },
            data: { deleted_at: deletedAt },
        });
        if (count === 0) return false;
        await tx.comment.updateMany({ where: { post_id: postId, deleted_at: null }, data: { deleted_at: deletedAt } });
        return true;
    });
}

export { listCategories, listPosts, getPost, createPost, updatePost, deletePost };
export type { CategoryRow, PostListRow, PostRow, CreateResult };
