import test from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import type { Request, Response } from 'express';
import conn from '../mysql.js';
import * as authController from './auth.js';
import authRouter from '../routes/auth.js';

/*
 * 소셜 로그인 두 자리를 못박습니다. 둘 다 docs/QA-2026-09-13.md 의 P0 였고,
 * 한 번 고쳐 두면 눈으로는 다시 열린 줄 알기 어려운 자리입니다.
 */

test('제공자 확인 없이 토큰을 내주는 소셜 로그인 경로가 없다', () => {
    /*
     * POST /social-login 은 본문의 socialId 를 그대로 믿고 그 사람의 토큰을 만들었습니다.
     * 화면은 카카오·구글·네이버 세 경로만 씁니다.
     */
    const paths = authRouter.stack.filter((layer) => layer.route).map((layer) => layer.route!.path);

    assert.ok(!paths.includes('/social-login'), `되살아난 경로: ${paths.join(', ')}`);
    assert.strictEqual((authController as Record<string, unknown>).socialLogin, undefined);
    assert.deepStrictEqual(
        paths.filter((p) => ['/kakao', '/google', '/naver'].includes(p)).sort(),
        ['/google', '/kakao', '/naver'],
    );
});

/** 컨트롤러가 쓰는 만큼만 흉내 낸 res. json 으로 보낸 본문을 body 에 남깁니다. */
interface FakeRes {
    statusCode: number;
    body: Record<string, unknown> | null;
    status(code: number): FakeRes;
    json(body: Record<string, unknown>): FakeRes;
}

test('소셜 로그인 중 DB 오류가 나도 500 으로 답하고 프로세스는 살아 있다', async (t) => {
    // 제공자 쪽은 성공한 것으로 둡니다. 확인하려는 것은 그 뒤의 DB 오류 처리입니다.
    t.mock.method(axios, 'post', async () => ({ data: { access_token: 'test-token' } }));
    t.mock.method(axios, 'get', async () => ({ data: { id: 123, properties: { nickname: '테스트' } } }));

    /*
     * 실제 mysql2 처럼 콜백을 다음 틱에 부릅니다. 같은 틱에 부르면 콜백에서 난 예외를
     * Promise 가 삼켜 버려, 고치기 전 코드도 통과합니다. 예전 코드는 여기서 콜백 안의
     * results[0] 이 TypeError 를 내 uncaughtException 으로 테스트가 깨집니다.
     */
    t.mock.method(conn, 'query', (sql: string, values: unknown, callback: (error: Error) => void) => {
        const error = Object.assign(new Error('Connection lost'), { code: 'PROTOCOL_CONNECTION_LOST' });
        setImmediate(() => callback(error));
    });
    t.mock.method(console, 'error', () => {});

    const res: FakeRes = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };

    await authController.kakaoLogin({ query: { code: 'test-code' } } as unknown as Request, res as unknown as Response);

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body?.message, '카카오 로그인 처리 중 오류가 발생했습니다.');
    assert.strictEqual(res.body?.token, undefined);
});
