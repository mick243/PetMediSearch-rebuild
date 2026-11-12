import test from 'node:test';
import assert from 'node:assert';
import { Prisma } from './generated/prisma/client.js';
import { logError } from './logError.js';

/** console.error 로 나간 줄을 한 문자열로 모읍니다. */
function capture(t: test.TestContext, run: () => void) {
    const spy = t.mock.method(console, 'error', () => {});
    run();
    return spy.mock.calls.map((c) => c.arguments.map(String).join(' ')).join('\n');
}

test('Prisma 요청 오류는 코드와 모델 · 필드 이름만 남긴다', (t) => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the constraint: `uq_users_email`', {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { modelName: 'User', target: ['email'], driverAdapterError: { message: "Duplicate entry 'someone@example.com'" } },
    });
    const out = capture(t, () => logError('signup', error));
    assert.strictEqual(out, '[signup] PrismaClientKnownRequestError P2002 (User, target=email)');
    assert.ok(!out.includes('someone@example.com'));
});

test('Prisma 인자 검사 오류는 message 를 찍지 않는다 — 요청 값이 들어 있다', (t) => {
    const error = new Prisma.PrismaClientValidationError(
        'Invalid `prisma.post.create()` invocation: { data: { title: "비밀 제목", content: "<p>본문</p>" } }',
        { clientVersion: '7.10.0' },
    );
    const out = capture(t, () => logError('addPost', error));
    assert.strictEqual(out, '[addPost] PrismaClientValidationError');
});

test('mysql2 오류는 그대로', (t) => {
    const out = capture(t, () => logError('q', { code: 'ER_DUP_ENTRY', errno: 1062, sqlState: '23000', sqlMessage: "Duplicate entry for key 'x'", sql: 'INSERT …' }));
    assert.strictEqual(out, "[q] ER_DUP_ENTRY (errno 1062, 23000): Duplicate entry for key 'x'");
});

test('보통 오류는 문구와 스택', (t) => {
    const out = capture(t, () => logError('x', new TypeError('boom')));
    assert.ok(out.startsWith('[x] TypeError: boom\nTypeError: boom'));
});
