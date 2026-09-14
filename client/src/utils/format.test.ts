import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDate, daysUntil, ddayLabel, parseServerTime } from './format';

describe('parseServerTime', () => {
  /*
   * 서버는 시간대 표시 없이 '2026-09-13 23:39:00' 처럼 보냅니다.
   * 그대로 new Date() 에 넣으면 보는 사람의 시간대로 읽혀, DB 가 UTC 로 돌던
   * 동안 "9시간 전" 이 나왔습니다. 어느 시간대의 값인지 붙여서 읽습니다.
   */
  it('시각이 있는 값은 KST 로 읽는다', () => {
    expect(parseServerTime('2026-09-13 23:39:00')?.toISOString()).toBe(
      '2026-09-13T14:39:00.000Z'
    );
  });

  it('T 로 이어진 값도 같게 읽는다', () => {
    expect(parseServerTime('2026-09-13T23:39:00')?.toISOString()).toBe(
      '2026-09-13T14:39:00.000Z'
    );
  });

  it('이미 시간대가 붙어 있으면 건드리지 않는다', () => {
    expect(parseServerTime('2026-09-13T14:39:00Z')?.toISOString()).toBe(
      '2026-09-13T14:39:00.000Z'
    );
    expect(parseServerTime('2026-09-13T23:39:00+09:00')?.toISOString()).toBe(
      '2026-09-13T14:39:00.000Z'
    );
  });

  it('날짜만 있는 값에는 시간대를 붙이지 않는다', () => {
    // 붙이면 그 날의 자정이 다른 날로 넘어가 D-day 가 하루 밀립니다.
    const parsed = parseServerTime('2026-09-17');
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(8);
    expect(parsed?.getDate()).toBe(17);
    expect(parsed?.getHours()).toBe(0);
  });

  it('빈 값과 엉뚱한 값은 null', () => {
    expect(parseServerTime()).toBeNull();
    expect(parseServerTime(null)).toBeNull();
    expect(parseServerTime('')).toBeNull();
    expect(parseServerTime('   ')).toBeNull();
    expect(parseServerTime('어제')).toBeNull();
  });
});

/*
 * 날짜 표시와 D-day.
 *
 * 홈의 접종 타일과 일정 목록이 같은 셈을 써야 해서 한곳에 모은 함수들입니다.
 * 하루 경계에서 어긋나면 "오늘" 이어야 할 일정이 "1일 지남" 으로 보입니다.
 */

describe('formatDate', () => {
  it('기본은 YY.MM.DD', () => {
    expect(formatDate('2026-03-05')).toBe('26.03.05');
  });

  it('형식을 주면 그대로 따른다', () => {
    expect(formatDate('2026-03-05', 'YYYY.MM.DD')).toBe('2026.03.05');
  });

  it('시·분·초 형식이 제 값을 찍는다', () => {
    /*
     * dayjs 는 MM 을 월로, SS 를 그냥 글자로 봅니다. 후기 상세가 'HH.MM.SS' 로
     * 적혀 있어 `26.09.13 14.09.SS` 가 찍혔습니다 — 화면에서 보기 전까지
     * 모릅니다. 토큰을 여기에 고정해 둡니다.
     *
     * 시간대를 정해 놓고 봅니다. formatDate 는 일부러 **보는 사람의 시간대**로
     * 찍으므로, 정하지 않으면 이 값이 실행하는 기계를 따라 바뀝니다.
     * (UTC 로 도는 CI 에서 05:39:05 가 나와 처음에 이 테스트가 깨졌습니다)
     */
    const before = process.env.TZ;
    try {
      process.env.TZ = 'Asia/Seoul';
      expect(formatDate('2026-09-13 14:39:05', 'YY.MM.DD HH:mm:ss')).toBe(
        '26.09.13 14:39:05'
      );
    } finally {
      if (before === undefined) delete process.env.TZ;
      else process.env.TZ = before;
    }
  });
});

describe('daysUntil / ddayLabel', () => {
  beforeEach(() => {
    // 시각을 고정합니다. 안 그러면 자정 근처에서만 깨지는 테스트가 됩니다.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T15:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('오늘은 0', () => {
    expect(daysUntil('2026-03-05')).toBe(0);
    expect(ddayLabel(0)).toBe('오늘');
  });

  it('시각에 상관없이 날짜로만 센다', () => {
    // 오후 3시 30분이어도 "오늘" 은 0 이어야 합니다.
    vi.setSystemTime(new Date('2026-03-05T23:59:00'));
    expect(daysUntil('2026-03-05')).toBe(0);
    vi.setSystemTime(new Date('2026-03-05T00:01:00'));
    expect(daysUntil('2026-03-05')).toBe(0);
  });

  it('앞날은 양수', () => {
    expect(daysUntil('2026-03-08')).toBe(3);
    expect(ddayLabel(3)).toBe('D-3');
  });

  it('지난 날은 음수이고 문구가 바뀐다', () => {
    expect(daysUntil('2026-03-01')).toBe(-4);
    expect(ddayLabel(-4)).toBe('4일 지남');
  });

  it('달을 넘어가도 맞는다', () => {
    expect(daysUntil('2026-04-05')).toBe(31);
  });

  it('윤년 2월을 넘어가도 맞는다', () => {
    vi.setSystemTime(new Date('2028-02-28T09:00:00'));
    // 2028 은 윤년이라 2월 29일이 있습니다.
    expect(daysUntil('2028-03-01')).toBe(2);
  });
});
