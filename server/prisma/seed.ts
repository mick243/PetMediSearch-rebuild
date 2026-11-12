/*
 * 개발·데모용 시드. 운영에는 넣지 않습니다.
 *
 * 예전에는 createTables.sql 이 스키마와 함께 이 계정들을 넣었습니다. 스키마(마이그레이션)와
 * 데이터를 갈라 두려고 여기로 옮겼습니다 — 분류 9개처럼 앱이 돌기 위해 꼭 있어야 하는 것만
 * 마이그레이션(prisma/migrations/0_init)에 남기고, 없어도 되는 것은 시드로 둡니다.
 *
 *   cd server && npx prisma db seed     (prisma.config.ts 의 migrations.seed)
 *
 * 이미 있는 행은 건너뜁니다. 여러 번 돌려도 같습니다.
 */
import prisma from '../db/prisma.js';
import { isMain } from '../paths.js';

/** 이메일이 없어 로그인은 못 하는 예시 계정. 글·댓글의 작성자 자리를 채우는 용도입니다. */
const SAMPLE_USERS = [
    { user_id: 1, username: '신짱구' },
    { user_id: 2, username: '신짱아' },
    { user_id: 3, username: '훈이' },
    { user_id: 4, username: '맹구' },
    { user_id: 5, username: '철수' },
    { user_id: 6, username: '유리' },
] as const;

async function seed() {
    const { count } = await prisma.user.createMany({ data: [...SAMPLE_USERS], skipDuplicates: true });
    console.log(`예시 계정 ${count}개를 넣었습니다(이미 있던 것은 건너뜀).`);
}

if (isMain(import.meta.url)) {
    seed()
        .catch((error: unknown) => {
            console.error('시드 실패:', error instanceof Error ? error.message : error);
            process.exitCode = 1;
        })
        .finally(() => prisma.$disconnect());
}

export { SAMPLE_USERS, seed };
