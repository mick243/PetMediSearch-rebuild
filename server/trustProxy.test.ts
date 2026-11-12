import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { parseTrustProxy } from './trustProxy.js';

/*
 * TRUST_PROXY 읽기 (trustProxy.ts).
 *
 * 요청 제한이 사용자를 제대로 가르는지가 이 값 하나에 달려 있는데, 틀려도 서버는
 * 멀쩡히 떠서 눈으로는 알 수 없습니다.
 */

test('비어 있거나 끄는 값이면 설정하지 않는다', () => {
    // 예전에는 0 과 false 도 1 로 읽혀 오히려 켜졌습니다.
    for (const raw of [undefined, '', '  ', '0', 'false', 'FALSE', 'off', 'no']) {
        assert.equal(parseTrustProxy(raw), false, JSON.stringify(raw));
    }
});

test('숫자는 앞에 놓인 프록시 수로 읽는다', () => {
    assert.equal(parseTrustProxy('1'), 1);
    assert.equal(parseTrustProxy(' 2 '), 2);
});

test('주소 목록은 나눠서 넘기고, Express 가 받아들인다', () => {
    const value = parseTrustProxy('loopback, 10.0.0.0/8');

    assert.deepEqual(value, ['loopback', '10.0.0.0/8']);
    assert.doesNotThrow(() => express().set('trust proxy', value));
});

test('틀린 주소는 서버가 뜨기 전에 오류가 난다', () => {
    assert.throws(() => express().set('trust proxy', parseTrustProxy('nginx')));
});

test('모두를 믿는 true 는 받지 않는다', () => {
    for (const raw of ['true', 'TRUE', 'yes', 'on']) {
        assert.throws(() => parseTrustProxy(raw), /true 는 쓸 수 없습니다/, raw);
    }
});
