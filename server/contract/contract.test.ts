import test from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import type { AddressInfo } from 'net';
import path from 'path';
import { spawn } from 'child_process';
import { adminSettings, prepareDatabase } from './db.js';
import type { AppDbSettings } from './db.js';
import { steps } from './scenario.js';
import type { CapturedBody, Ctx, Step } from './scenario.js';

/*
 * 응답 기준선 (golden.json).
 *
 * 고정 데이터를 깐 DB 에 앱을 띄우고 scenario.ts 의 요청을 차례로 보내, 상태 코드와 응답
 * 본문이 기준선과 한 글자도 다르지 않은지 봅니다. 서버를 TypeScript 로 옮기고 DB 접근을
 * Prisma 로 바꾸는 동안 화면이 받는 모양이 그대로인지를 이 파일 하나로 확인합니다.
 * 날짜가 문자열에서 Date 로, DECIMAL 이 '3.20' 에서 3.2 로 바뀌는 것 같은 일은 눈으로는
 * 놓치기 쉽습니다.
 *
 * 돌리는 법 (README 의 "응답 기준선"):
 *   CONTRACT_DB_HOST=127.0.0.1 CONTRACT_DB_PORT=3307 CONTRACT_DB_PASSWORD=... npm run test:contract
 * 기준선을 새로 뜨려면 UPDATE_GOLDEN=1 을 더합니다. 바뀐 이유를 커밋에 적으세요.
 *
 * CONTRACT_DB_HOST 가 없으면 건너뜁니다. 평소의 npm test 는 DB 없이 돕니다.
 */

const GOLDEN = path.join(import.meta.dirname, 'golden.json');
const SERVER_DIR = path.join(import.meta.dirname, '..');
const admin = adminSettings();

const freePort = () =>
    new Promise<number>((resolve, reject) => {
        const probe = net.createServer();
        probe.unref();
        probe.on('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            const { port } = probe.address() as AddressInfo;
            probe.close(() => resolve(port));
        });
    });

/**
 * 앱을 띄웁니다. server/.env 가 있어도 여기 적은 값이 이깁니다(dotenv 는 이미 있는 값을
 * 덮지 않습니다). 바깥 서비스(AI 요약·웹 푸시·알림 배치)는 전부 꺼서 결과가 흔들리지 않게 합니다.
 */
function startApp(port: number, db: AppDbSettings) {
    const env = {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(port),
        DB_HOST: db.host,
        DB_PORT: String(db.port),
        DB_USER: db.user,
        DB_PASSWORD: db.password,
        DB_NAME: db.database,
        DB_POOL_SIZE: '',
        DB_ROOT_PASSWORD: '',
        JWT_SECRET: 'contract-test-only-secret-not-for-any-deployment',
        CORS_ORIGIN: 'http://localhost:5000',
        URL: 'http://localhost:5000',
        TRUST_PROXY: '',
        FACILITIES_LIMIT: '',
        REMINDER_CRON: '',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: '',
        ANTHROPIC_API_KEY: '',
        OPENAI_API_KEY: '',
        VAPID_PUBLIC_KEY: '',
        VAPID_PRIVATE_KEY: '',
        VAPID_SUBJECT: '',
    };
    const child = spawn(process.execPath, ['dist/app.js'], { cwd: SERVER_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const exited = new Promise((resolve) => child.on('exit', resolve));
    return { child, exited, output: () => output };
}

async function waitHealthy(base: string, app: ReturnType<typeof startApp>) {
    for (let i = 0; i < 75; i++) {
        try {
            if ((await fetch(`${base}/health`)).ok) return;
        } catch {
            // 아직 안 떴습니다.
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`앱이 뜨지 않았습니다.\n${app.output().slice(-2000)}`);
}

/** 요청 하나를 기다리는 상한. bcrypt(비용 4)와 DB 를 거쳐도 1초 안입니다. */
const REQUEST_TIMEOUT_MS = 15_000;

const sha256 = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');

async function send(base: string, step: Step, ctx: Ctx) {
    const method = step.method || 'GET';
    const target = typeof step.path === 'function' ? step.path(ctx) : step.path;
    const headers: Record<string, string> = {};
    if (step.as) {
        const token = ctx.tokens[step.as];
        if (!token) throw new Error(`${step.name}: ${step.as} 로 로그인한 토큰이 없습니다.`);
        headers.authorization = `Bearer ${token}`;
    }
    let body;
    if (step.body !== undefined) {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(typeof step.body === 'function' ? step.body(ctx) : step.body);
    }

    /*
     * 응답이 안 오는 핸들러(res 를 부르지 않고 끝나는 경로)가 있으면 여기서 영원히 기다립니다 —
     * 실제로 한 번 CI 가 6시간을 매달렸습니다. 어느 단계인지 이름을 달아 끊습니다.
     */
    let res: globalThis.Response;
    try {
        res = await fetch(base + target, { method, headers, body, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
        throw new Error(`${step.name} (${method} ${target}): ${REQUEST_TIMEOUT_MS / 1000}초 안에 응답이 없습니다.`, { cause: error });
    }
    const type = res.headers.get('content-type') || '';
    const raw = Buffer.from(await res.arrayBuffer());
    const parsed: unknown = type.includes('application/json')
        ? JSON.parse(raw.toString('utf8'))
        : { bytes: raw.length, sha256: sha256(raw) };

    return {
        record: {
            step: step.name,
            request: `${method} ${target}`,
            status: res.status,
            type,
            cacheControl: res.headers.get('cache-control'),
            body: parsed,
        },
        parsed,
    };
}

/** 한국 벽시계 'YYYY-MM-DD HH:MM:SS'. API 가 내보내는 시각의 모양입니다(db/format.ts 의 timestampToKst). */
const WALL_CLOCK = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/;
const NOW_TOLERANCE_MS = 10 * 60 * 1000;

/**
 * 돌릴 때마다 달라지는 값만 자리표시로 바꿉니다.
 *
 * 방금 쓴 행의 시각은 '<방금>' 이 됩니다. 단, 지금의 한국 시각과 10분 안일 때만입니다.
 * 9시간 어긋나게 들어가면(시간대 처리가 틀리면) 원래 값이 그대로 남아 기준선과 달라집니다.
 */
function normalize(value: unknown, key?: string): unknown {
    if (Array.isArray(value)) return value.map((item) => normalize(item));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, k)]));
    }
    if (key === 'token' && typeof value === 'string') return '<token>';
    if (key === 'uptime' && typeof value === 'number') return '<uptime>';
    if (typeof value === 'string' && WALL_CLOCK.test(value)) {
        const asIfUtc = Date.parse(`${value.replace(' ', 'T')}Z`);
        const kstNow = Date.now() + 9 * 60 * 60 * 1000;
        if (Math.abs(asIfUtc - kstNow) < NOW_TOLERANCE_MS) return '<방금>';
    }
    return value;
}

/** 기준선의 한 줄. golden.json 의 한 항목이 이 모양입니다(send 의 record). */
interface GoldenRecord {
    step: string;
    request: string;
    status: number;
    type: string;
    cacheControl: string | null;
    body: unknown;
}

test('API 응답이 기준선과 같다', {
    skip: admin ? false : 'CONTRACT_DB_HOST 가 없어 건너뜁니다 (README 의 "응답 기준선")',
    timeout: 180_000,
}, async (t) => {
    // admin 이 없으면 위의 skip 으로 이 함수는 돌지 않습니다.
    const db = await prepareDatabase(admin!);
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const app = startApp(port, db);

    const records: GoldenRecord[] = [];
    try {
        await waitHealthy(base, app);
        const ctx: Ctx = { tokens: {} };
        for (const step of steps) {
            const { record, parsed } = await send(base, step, ctx);
            if (step.capture && record.status < 400) step.capture(parsed as CapturedBody, ctx);
            records.push(normalize(record) as GoldenRecord);
        }
    } finally {
        app.child.kill();
        await app.exited;
    }

    if (process.env.UPDATE_GOLDEN) {
        fs.writeFileSync(GOLDEN, `${JSON.stringify(records, null, 2)}\n`);
        t.diagnostic(`기준선을 새로 떴습니다: ${records.length}단계`);
        return;
    }

    assert.ok(fs.existsSync(GOLDEN), '기준선이 없습니다. UPDATE_GOLDEN=1 로 한 번 떠 주세요.');
    const golden: GoldenRecord[] = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
    assert.deepStrictEqual(
        records.map((r) => r.step),
        golden.map((g) => g.step),
        '단계 목록이 기준선과 다릅니다. scenario.ts 를 바꿨다면 기준선을 다시 뜨세요.',
    );
    for (let i = 0; i < records.length; i++) {
        await t.test(records[i].step, () => assert.deepStrictEqual(records[i], golden[i]));
    }
});
