import prisma from '../db/prisma.js';
import { Prisma } from '../generated/prisma/client.js';

/*
 * 계정 저장소. 로그인 · 가입 · 내 정보 · 비밀번호 · 탈퇴(controller/auth.ts)와 토큰 판번호
 * 미들웨어(middleware/tokenVersion.ts)가 씁니다.
 *
 * 비밀번호 해시는 전역 omit(db/prisma.ts)으로 기본 제외라, 확인이 필요한 두 함수만 select 로
 * 명시해 읽습니다. 그 밖의 함수가 돌려주는 값에는 해시가 없습니다.
 */

/** 토큰과 화면에 넘길 계정(controller/auth.ts 의 SessionUser 와 같은 모양). */
interface SessionUser {
    user_id: number;
    username: string;
    social_type?: string | null;
    role?: string | null;
    token_version?: number | null;
}

/** 내 정보 화면이 받아가는 칸. */
interface Account extends SessionUser {
    email: string | null;
    phone: string | null;
}

/** 비밀번호 확인이 필요한 자리(로그인 · 비밀번호 변경)에만 해시가 딸려옵니다. */
interface Credential extends SessionUser {
    password: string | null;
}

interface LocalSignup {
    username: string;
    email: string;
    /** bcrypt 해시. 평문은 여기까지 오지 않습니다. */
    password: string;
    phone: string | null;
    address: string;
}

interface AccountChanges {
    username?: string;
    email?: string;
    phone?: string | null;
}

const isDuplicate = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const SESSION_SELECT = { user_id: true, username: true, social_type: true, role: true, token_version: true } as const;

/** 소셜 로그인으로 들어온 계정. 탈퇴한 계정은 소셜 식별자가 비워지므로 걸리지 않습니다. */
async function findBySocial(socialId: string, socialType: string): Promise<SessionUser | null> {
    return prisma.user.findFirst({ where: { social_id: socialId, social_type: socialType, deleted_at: null }, select: SESSION_SELECT });
}

/**
 * 소셜 계정 만들기. 가입 폼을 거치지 않아 체크박스를 보여 줄 자리가 없으므로, 로그인 화면의
 * 소셜 버튼 아래에 "누르면 동의한 것으로 봅니다" 를 적어 두고 이 시점을 동의 시각으로 남깁니다.
 */
async function createSocial(socialId: string, socialType: string, username: string): Promise<SessionUser> {
    return prisma.user.create({
        data: { social_id: socialId, social_type: socialType, username, terms_agreed_at: new Date() },
        select: SESSION_SELECT,
    });
}

/** 일반 가입. 이메일이 겹치면 'duplicate-email' — 미리 조회하지 않고 UNIQUE 제약이 낸 오류를 받습니다(§2.8). */
async function createLocal(input: LocalSignup): Promise<SessionUser | 'duplicate-email'> {
    try {
        return await prisma.user.create({ data: { ...input, role: 'user', terms_agreed_at: new Date() }, select: SESSION_SELECT });
    } catch (error) {
        if (isDuplicate(error)) return 'duplicate-email';
        throw error;
    }
}

/** 로그인. 탈퇴한 계정은 이메일이 비워지므로 걸리지 않지만, 뜻을 조건에 남겨 둡니다. */
async function findForLogin(email: string): Promise<Credential | null> {
    return prisma.user.findFirst({ where: { email, deleted_at: null }, select: { ...SESSION_SELECT, password: true } });
}

/** 내 정보. 토큰에는 이름 · 이메일이 없어 수정 폼이 열릴 때 받아갑니다. */
async function findAccount(userId: number): Promise<Account | null> {
    return prisma.user.findFirst({ where: { user_id: userId, deleted_at: null }, select: { ...SESSION_SELECT, email: true, phone: true } });
}

/** 보낸 항목만 고칩니다. 이메일이 겹치면 'duplicate-email'. */
async function updateAccount(userId: number, changes: AccountChanges): Promise<'updated' | 'duplicate-email'> {
    try {
        await prisma.user.updateMany({ where: { user_id: userId, deleted_at: null }, data: changes });
        return 'updated';
    } catch (error) {
        if (isDuplicate(error)) return 'duplicate-email';
        throw error;
    }
}

/** 비밀번호 변경에 필요한 것만: 지금 해시와 판번호. */
async function findForPasswordChange(userId: number): Promise<Credential | null> {
    return prisma.user.findFirst({ where: { user_id: userId, deleted_at: null }, select: { ...SESSION_SELECT, password: true } });
}

/** 새 해시와 판번호를 함께 씁니다. 판번호가 오르면 이전에 나간 토큰은 전부 끊깁니다. */
async function setPassword(userId: number, hash: string, tokenVersion: number): Promise<void> {
    await prisma.user.updateMany({ where: { user_id: userId, deleted_at: null }, data: { password: hash, token_version: tokenVersion } });
}

/**
 * 살아 있는 계정의 역할. 없거나 탈퇴했으면 null.
 * 토큰에도 role 이 실려 있지만 하루짜리라, 권한을 거둔 뒤에도 남은 토큰으로 관리자 일을 할 수 있으면 안 됩니다(§2.2).
 */
async function roleOf(userId: number): Promise<string | null> {
    const row = await prisma.user.findFirst({ where: { user_id: userId, deleted_at: null }, select: { role: true } });
    return row?.role ?? null;
}

/** 토큰 판번호. 행이 없으면 null. */
async function tokenVersionOf(userId: number): Promise<number | null> {
    const row = await prisma.user.findUnique({ where: { user_id: userId }, select: { token_version: true } });
    return row?.token_version ?? null;
}

/**
 * 탈퇴. 여섯 문장을 한 트랜잭션에 묶습니다 — 계정은 닫혔는데 글은 남는 반쪽 상태를 만들지 않습니다.
 *
 * 계정 행은 남기고(FK 가 ON DELETE SET NULL 이라 지우면 글의 작성자만 사라짐) 개인정보만 비웁니다.
 * 이메일을 비워야 같은 주소로 다시 가입할 수 있습니다(UNIQUE 는 NULL 을 안 봅니다).
 * 판번호를 올려 남아 있던 토큰을 끊습니다. 글 · 댓글 · 후기는 같은 deletedAt 으로 감추고
 * (이미 지워진 것은 그대로), 본인만 보는 즐겨찾기 · 반려동물은 실제로 지웁니다(접종 일정은 FK CASCADE).
 *
 * 이미 탈퇴한 계정이면 false — 글은 건드리지 않습니다.
 */
async function withdraw(userId: number, deletedAt: Date): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
        const { count } = await tx.user.updateMany({
            where: { user_id: userId, deleted_at: null },
            data: {
                deleted_at: deletedAt,
                username: '탈퇴한 사용자',
                email: null, password: null, phone: null, address: null,
                social_id: null, social_type: null,
                token_version: { increment: 1 },
            },
        });
        if (count === 0) return false;

        const live = { user_id: userId, deleted_at: null };
        await tx.post.updateMany({ where: live, data: { deleted_at: deletedAt } });
        await tx.comment.updateMany({ where: live, data: { deleted_at: deletedAt } });
        await tx.review.updateMany({ where: live, data: { deleted_at: deletedAt } });
        await tx.favoriteFacility.deleteMany({ where: { user_id: userId } });
        await tx.pet.deleteMany({ where: { user_id: userId } });
        return true;
    });
}

/** 함수를 객체 하나로 묶어 내보냅니다. 테스트가 t.mock.method 로 한 함수씩 바꿔 끼울 수 있습니다(ESM 이름 내보내기는 바꿀 수 없음). */
const users = { findBySocial, createSocial, createLocal, findForLogin, findAccount, updateAccount, findForPasswordChange, setPassword, roleOf, tokenVersionOf, withdraw };

export default users;
export type { SessionUser, Account, Credential, LocalSignup, AccountChanges };
