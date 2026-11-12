/*
 * 기준선용 DB 를 새로 깝니다: 마이그레이션(prisma/migrations) → 시드 → 고정 데이터 → 앱 전용 계정.
 *
 * 스키마는 운영이 처음 뜰 때와 같은 SQL(prisma/migrations/*)을 그대로 씁니다. 앱은 root 가 아니라
 * scripts/createDbUser.ts 와 같은 권한의 계정으로 붙어서, 권한이 모자란 자리(예: 이모티콘 삭제의
 * ALTER)가 여기서 드러납니다.
 *
 * 반드시 이 테스트만 쓰는 MySQL 에 대고 돌리세요. 이름에 contract 가 든 DB 를 지우고 새로 만듭니다.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { statements } from '../scripts/createDbUser.js';
import { SAMPLE_USERS } from '../prisma/seed.js';
import { loadFixture } from './fixture.js';
import type { ConnectionOptions, QueryError, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const DATABASE = 'petmedisearch_contract';
const APP_USER = 'contract_app';
const MIGRATIONS_DIR = path.join(import.meta.dirname, '..', 'prisma', 'migrations');

/** 마이그레이션 디렉터리를 이름순으로. Prisma 도 같은 순서(타임스탬프 접두어)로 적용합니다. */
const migrationDirs = () =>
    fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .map((name) => path.join(MIGRATIONS_DIR, name));

/** 스키마를 깔고 고정 데이터를 넣는 관리자 계정의 접속 정보. */
interface AdminSettings {
    host: string;
    port: number;
    user: string;
    password: string;
}

/** 앱이 붙는 접속 정보 — 앱 전용 계정과 기준선 DB 입니다. */
interface AppDbSettings extends AdminSettings {
    database: string;
}

/** CONTRACT_DB_* 로 받은 관리자 접속 정보. 없으면 null — 테스트를 건너뜁니다. */
function adminSettings(env = process.env): AdminSettings | null {
    if (!env.CONTRACT_DB_HOST) return null;
    return {
        host: env.CONTRACT_DB_HOST,
        port: Number(env.CONTRACT_DB_PORT) || 3306,
        user: env.CONTRACT_DB_USER || 'root',
        password: env.CONTRACT_DB_PASSWORD || '',
    };
}

/**
 * 막 띄운 MySQL 은 초기화하는 동안 한 번 내려갔다 다시 뜹니다. 그 사이에 붙으면 거절되므로
 * 30초까지 기다립니다.
 */
async function connectWithRetry(settings: ConnectionOptions) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await mysql.createConnection(settings);
        } catch (error) {
            const starting = ['ECONNREFUSED', 'ECONNRESET', 'PROTOCOL_CONNECTION_LOST'].includes((error as QueryError).code);
            if (!starting || attempt >= 30) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}

async function prepareDatabase(admin: AdminSettings): Promise<AppDbSettings> {
    const db = await connectWithRetry({ ...admin, multipleStatements: true, charset: 'utf8mb4' });
    try {
        /*
         * 운영 compose 는 DB 를 --default-time-zone=+09:00 으로 띄웁니다. NOW() 가 넣는
         * 시각이 그 값을 따르므로, 다르면 기준선의 "방금 쓴 시각" 이 9시간 어긋납니다.
         * 전역 설정을 여기서 바꾸지 않고 확인만 합니다 — 남의 DB 를 건드리지 않게.
         */
        const [[zone]] = await db.query<RowDataPacket[]>('SELECT @@global.time_zone AS tz');
        if (zone.tz !== '+09:00') {
            throw new Error(`테스트 DB 의 time_zone 이 ${zone.tz} 입니다. --default-time-zone=+09:00 으로 띄우세요.`);
        }

        await db.query<ResultSetHeader>(`DROP DATABASE IF EXISTS \`${DATABASE}\``);
        await db.query<ResultSetHeader>(`CREATE DATABASE \`${DATABASE}\` CHARACTER SET utf8mb4`);
        await db.query(`USE \`${DATABASE}\``);

        /*
         * 스키마는 마이그레이션 파일을 차례로 적용해 깝니다 — 운영이 prisma migrate deploy 로 까는 것과
         * 같은 SQL 입니다. 그 뒤 시드(예시 계정)와 고정 데이터를 넣습니다. 고정 데이터의 글·댓글은
         * 시드 계정을 작성자로 쓰지 않지만, 개발 DB 와 같은 모양을 두려고 시드도 넣습니다.
         */
        for (const dir of migrationDirs()) {
            await db.query(fs.readFileSync(path.join(dir, 'migration.sql'), 'utf8'));
        }
        await db.query<ResultSetHeader>('INSERT INTO users (user_id, username) VALUES ?', [SAMPLE_USERS.map((u) => [u.user_id, u.username])]);
        await loadFixture(db);

        const password = crypto.randomBytes(18).toString('base64url');
        for (const [sql, values] of statements({ user: APP_USER, password, database: DATABASE })) {
            await db.query(sql, values);
        }
        return { host: admin.host, port: admin.port, user: APP_USER, password, database: DATABASE };
    } finally {
        await db.end();
    }
}

export { adminSettings, prepareDatabase, DATABASE };
export type { AdminSettings, AppDbSettings };
