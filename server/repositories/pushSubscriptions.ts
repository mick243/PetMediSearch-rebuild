import prisma from '../db/prisma.js';

/*
 * 웹 푸시 구독 저장소. 구독은 사람이 아니라 **기기**에 붙습니다 — 한 사람이 휴대폰과 노트북에서
 * 각각 켜면 행이 둘입니다. 알림을 보내는 배치(scripts/sendReminders.ts)는 아직 mysql2 로 읽습니다.
 */

interface Subscription {
    endpoint: string;
    p256dh: string;
    auth: string;
}

/**
 * 같은 기기가 다시 구독하면 같은 endpoint 가 옵니다. UNIQUE 에 걸린 것을 받아 갱신합니다 —
 * 먼저 SELECT 로 확인하면 두 탭이 동시에 켤 때 사이로 빠져나갑니다.
 * user_id 도 갱신합니다. 한 기기를 다른 사람이 로그인해 쓰면 주인이 바뀝니다.
 */
async function save(userId: number, sub: Subscription): Promise<void> {
    await prisma.pushSubscription.upsert({
        where: { endpoint: sub.endpoint },
        create: { user_id: userId, ...sub },
        update: { user_id: userId, p256dh: sub.p256dh, auth: sub.auth },
    });
}

/** 본인 구독만 지웁니다. 남의 endpoint 를 알아도 끌 수 없어야 합니다. 없던 것을 꺼도 오류가 아닙니다. */
async function remove(userId: number, endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, user_id: userId } });
}

/** 이 사용자가 이 기기에서 알림을 켜 두었는지. 화면의 토글 초기값에 씁니다. */
async function exists(userId: number, endpoint: string): Promise<boolean> {
    const row = await prisma.pushSubscription.findFirst({ where: { endpoint, user_id: userId }, select: { subscription_id: true } });
    return row !== null;
}

/** 함수를 객체 하나로 묶어 내보냅니다. 테스트가 t.mock.method 로 한 함수씩 바꿔 끼울 수 있습니다(ESM 이름 내보내기는 바꿀 수 없음). */
const pushSubscriptions = { save, remove, exists };

export default pushSubscriptions;
export type { Subscription };
