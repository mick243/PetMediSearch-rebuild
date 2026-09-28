/*
 * Prisma CLI 설정(generate · migrate · db seed).
 *
 * CLI 는 관리자(root) 계정으로 붙습니다. 앱 계정(DB_USER, scripts/createDbUser.ts)은 행 읽기·쓰기만
 * 있어 CREATE TABLE 을 못 하므로 마이그레이션이 안 됩니다. 앱은 이 파일을 읽지 않습니다 —
 * 앱의 접속은 db/prisma.ts 가 DB_USER · DB_PASSWORD 로 따로 만듭니다.
 *
 * 접속 정보는 server/.env 의 DB_* 와 DB_ROOT_USER · DB_ROOT_PASSWORD 에서 만듭니다. URL 하나를
 * 따로 두면 암호가 두 곳에 적히고, 바꿀 때 한쪽을 빼먹습니다.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

dotenv.config({ path: path.join(import.meta.dirname, '.env') });

const env = process.env;

/** 암호에 @ · : · / 같은 글자가 있으면 URL 이 깨집니다. 반드시 인코딩합니다. */
const encode = (value: string) => encodeURIComponent(value);

const database = env.DB_NAME || 'petmedisearch';
const adminUrl = (db: string) =>
    `mysql://${encode(env.DB_ROOT_USER || 'root')}:${encode(env.DB_ROOT_PASSWORD || '')}` +
    `@${env.DB_HOST || 'localhost'}:${env.DB_PORT || '3306'}/${db}`;

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx prisma/seed.ts',
    },
    datasource: {
        url: adminUrl(database),
        /*
         * 그림자 DB. migrate diff(마이그레이션 ↔ schema.prisma)와 migrate dev 가 마이그레이션을
         * 빈 DB 에 처음부터 적용해 보는 자리입니다. 같은 서버의 `<DB_NAME>_shadow` 를 쓰고,
         * Prisma 가 만들고 지웁니다. 개발 DB 자체는 건드리지 않습니다.
         */
        shadowDatabaseUrl: env.SHADOW_DATABASE_URL || adminUrl(`${database}_shadow`),
    },
});
