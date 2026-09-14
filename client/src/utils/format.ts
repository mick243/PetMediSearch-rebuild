import dayjs from 'dayjs';

/**
 * 서버가 보내는 시각의 시간대.
 *
 * DB 세션(docker-compose 의 --default-time-zone)과 드라이버(server/mysql.js 의
 * timezone)를 이 값으로 못박아 두었습니다. 세 곳이 같은 값이어야 합니다.
 */
const SERVER_UTC_OFFSET = '+09:00';

/** 'YYYY-MM-DD' — 생일·접종 마감일처럼 시각이 없는 값. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 이미 시간대가 붙어 있는 값('...Z', '...+09:00'). */
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * 서버가 보낸 시각 문자열을 Date 로 바꿉니다.
 *
 * 서버는 '2026-09-13 23:39:00' 처럼 시간대 표시 없이 보냅니다. 이 문자열을 그대로
 * new Date() 에 넣으면 브라우저는 **보는 사람의 시간대**로 읽습니다. 한국에서 보면
 * 우연히 맞지만, 다른 시간대에서 열면 그 차이만큼 통째로 어긋납니다.
 * 값이 어느 시간대인지 붙여서 읽어, 어디서 보든 같은 순간을 가리키게 합니다.
 *
 * 날짜만 있는 값에는 붙이지 않습니다 — 붙이면 그 날의 자정이 다른 날로 넘어가
 * D-day 가 하루 밀립니다. 그런 값은 "그 날" 을 뜻하므로 보는 사람의 하루로 둡니다.
 */
export const parseServerTime = (value?: string | null): Date | null => {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const iso = DATE_ONLY.test(text)
    ? `${text}T00:00:00`
    : `${text.replace(' ', 'T')}${HAS_ZONE.test(text) ? '' : SERVER_UTC_OFFSET}`;

  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDate = (date: string, format?: string) => {
  const parsed = parseServerTime(date);
  return dayjs(parsed ?? date).format(format ? format : 'YY.MM.DD');
};

/**
 * 오늘 기준 D-day. 지난 날짜는 음수입니다.
 * 홈의 접종 타일과 일정 목록이 같은 셈을 써야 해서 여기 둡니다.
 */
export const daysUntil = (date: string): number => {
  const target = parseServerTime(date);
  if (!target) return 0;
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

/**
 * 서버가 보낸 TIME 을 화면용 'HH:MM' 으로. 값이 없으면 빈 문자열입니다.
 * 서버는 'HH:MM:SS' 로 보내는데, 그대로 두면 화면마다 '15:00' 과 '15:00:00' 이 섞입니다.
 */
export const hhmm = (time?: string | null): string =>
  time ? String(time).slice(0, 5) : '';

/**
 * 접종·검진 일정의 "언제" 를 한 줄로. "2026-09-16" 또는 "2026-09-16 15:30".
 *
 * 시각은 선택입니다. 없을 때 00:00 을 채워 넣으면 "자정 예정" 으로 읽히는데,
 * 그건 알려 준 것이 아니라 틀린 것을 알려 준 것입니다.
 */
export const scheduleWhen = (
  dueDate: string,
  dueTime?: string | null
): string => {
  const date = String(dueDate ?? '').slice(0, 10);
  const time = hhmm(dueTime);
  return time ? `${date} ${time}` : date;
};

/** D-day 를 화면 문구로. "오늘" · "D-3" · "5일 지남" */
export const ddayLabel = (days: number): string => {
  if (days === 0) return '오늘';
  return days > 0 ? `D-${days}` : `${-days}일 지남`;
};
