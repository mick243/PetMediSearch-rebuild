import test from 'node:test';
import assert from 'node:assert';
import { Prisma } from '../generated/prisma/client.js';
import { timestampToKst, dateToString, timeToString, decimalToString, boolToInt, facilityTypeLabel } from './format.js';

/*
 * 값은 2단계에서 기준선 DB 를 어댑터로 읽어 직접 잰 것입니다
 * (docs/Backend-Rebuild-Handoff-2026-09-28.md 2장 표). 세션이 UTC 일 때의 모양입니다.
 */

test('TIMESTAMP 는 한국 벽시계 문자열이 된다', () => {
    // KST 2026-09-05 10:00 에 쓴 글. 세션 UTC 에서는 01:00Z 로 옵니다.
    assert.strictEqual(timestampToKst(new Date('2026-09-05T01:00:00Z')), '2026-09-05 10:00:00');
    // 날짜를 넘어가는 경우. KST 는 UTC 보다 앞서 있어 UTC 15:00 이 다음날 00:00 입니다.
    assert.strictEqual(timestampToKst(new Date('2026-12-31T15:00:00Z')), '2027-01-01 00:00:00');
    assert.strictEqual(timestampToKst(null), null);
});

test('timestamp(3) 은 밀리초까지 붙는다', () => {
    assert.strictEqual(timestampToKst(new Date('2026-09-05T01:00:00.120Z'), 3), '2026-09-05 10:00:00.120');
});

test('DATE 는 시간대를 더하지 않는다', () => {
    // 생일 2020-05-01. 어댑터는 2020-05-01T00:00Z 로 줍니다. 9시간을 더하면 날짜가 그대로지만,
    // 자정 근처에서 빼는 쪽으로 계산하면 하루가 밀립니다. 그래서 더하지도 빼지도 않습니다.
    assert.strictEqual(dateToString(new Date('2020-05-01T00:00:00Z')), '2020-05-01');
    assert.strictEqual(dateToString(null), null);
});

test('TIME 은 HH:MM:SS', () => {
    assert.strictEqual(timeToString(new Date('1970-01-01T10:30:00Z')), '10:30:00');
    assert.strictEqual(timeToString(new Date('1970-01-01T00:05:07Z')), '00:05:07');
    assert.strictEqual(timeToString(undefined), null);
});

test('DECIMAL 은 컬럼 자릿수를 지킨다', () => {
    // weight_kg decimal(5,2) — Prisma 는 "3.2" 로 주지만 mysql2 는 '3.20' 이었습니다.
    assert.strictEqual(decimalToString(new Prisma.Decimal('3.2'), 2), '3.20');
    // lat decimal(10,7)
    assert.strictEqual(decimalToString(new Prisma.Decimal('37.4979'), 7), '37.4979000');
    assert.strictEqual(decimalToString(null, 7), null);
});

test('tinyint(1) 은 0 · 1', () => {
    assert.strictEqual(boolToInt(false), 0);
    assert.strictEqual(boolToInt(true), 1);
    assert.strictEqual(boolToInt(null), null);
});

test('시설 종류는 한글로', () => {
    assert.strictEqual(facilityTypeLabel('hospital'), '병원');
    assert.strictEqual(facilityTypeLabel('pharmacy'), '약국');
});
