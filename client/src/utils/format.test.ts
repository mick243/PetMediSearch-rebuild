import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDate, daysUntil, ddayLabel } from './format';

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
