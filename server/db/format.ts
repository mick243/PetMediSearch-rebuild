/*
 * Prisma 가 돌려주는 값을 지금 API 응답과 같은 모양으로 바꿉니다.
 *
 * mysql2 풀은 dateStrings: true 라 시각을 DB 의 벽시계 문자열 그대로 주고, DECIMAL 도 자릿수
 * 그대로 문자열('3.20')로 줍니다. Prisma 는 Date · Decimal · Boolean 객체로 주므로 그냥 응답에
 * 실으면 화면이 받는 모양이 전부 바뀝니다(기준선 12단계가 깨집니다). 여기서 되돌립니다.
 *
 * 어댑터 세션은 UTC 입니다(db/prisma.ts). 그래서 TIMESTAMP 는 정확한 순간의 Date 로 오고,
 * DATE 와 TIME 은 "그 벽시계 숫자를 UTC 로 읽은" Date 로 옵니다(2020-05-01T00:00Z ·
 * 1970-01-01T10:30Z). 셋 다 UTC 게터로 읽되, TIMESTAMP 만 9시간을 더합니다.
 */
import type { FacilityType } from '../generated/prisma/enums.js';

/** 한국은 서머타임이 없어 고정 오프셋으로 정확합니다. mysql.ts 의 timezone: '+09:00' 과 같은 값입니다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const hms = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

/**
 * TIMESTAMP → 한국 벽시계 'YYYY-MM-DD HH:MM:SS'.
 * timestamp(3) 컬럼은 fractionDigits: 3 으로 '.mmm' 까지 붙입니다(mysql2 가 주던 모양).
 */
function timestampToKst(value: Date | null | undefined, fractionDigits = 0): string | null {
    if (value == null) return null;
    const shifted = new Date(value.getTime() + KST_OFFSET_MS);
    const base = `${ymd(shifted)} ${hms(shifted)}`;
    return fractionDigits > 0 ? `${base}.${pad(shifted.getUTCMilliseconds(), 3).slice(0, fractionDigits)}` : base;
}

/** DATE → 'YYYY-MM-DD'. 시간대를 더하지 않습니다 — 날짜 값에는 순간이 없습니다. */
function dateToString(value: Date | null | undefined): string | null {
    return value == null ? null : ymd(value);
}

/** TIME → 'HH:MM:SS'. */
function timeToString(value: Date | null | undefined): string | null {
    return value == null ? null : hms(value);
}

/**
 * DECIMAL → 컬럼 자릿수 그대로의 문자열. Prisma 의 Decimal 은 JSON 으로 나가면 뒷자리 0 이
 * 떨어져(3.20 → "3.2") 화면의 소수 표시가 흔들립니다. scale 은 스키마의 @db.Decimal(p, s) 값입니다.
 */
function decimalToString(value: { toFixed(digits: number): string } | null | undefined, scale: number): string | null {
    return value == null ? null : value.toFixed(scale);
}

/** tinyint(1) → 0 · 1. mysql2 는 불리언으로 바꾸지 않았고 화면도 숫자를 받습니다. */
function boolToInt(value: boolean | null | undefined): 0 | 1 | null {
    return value == null ? null : value ? 1 : 0;
}

/** 시설 종류 enum → DB 에 저장된 한글 그대로. 응답과 화면은 '병원' · '약국' 을 씁니다. */
const FACILITY_TYPE_LABEL: Record<FacilityType, '병원' | '약국'> = {
    hospital: '병원',
    pharmacy: '약국',
};

function facilityTypeLabel(value: FacilityType): '병원' | '약국' {
    return FACILITY_TYPE_LABEL[value];
}

export { timestampToKst, dateToString, timeToString, decimalToString, boolToInt, facilityTypeLabel, KST_OFFSET_MS };
