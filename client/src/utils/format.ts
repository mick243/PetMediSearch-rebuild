import dayjs from 'dayjs';

export const formatDate = (date: string, format?: string) => {
  return dayjs(date).format(format ? format : 'YY.MM.DD');
};

/**
 * 오늘 기준 D-day. 지난 날짜는 음수입니다.
 * 홈의 접종 타일과 일정 목록이 같은 셈을 써야 해서 여기 둡니다.
 */
export const daysUntil = (date: string): number => {
  const target = new Date(date);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

/** D-day 를 화면 문구로. "오늘" · "D-3" · "5일 지남" */
export const ddayLabel = (days: number): string => {
  if (days === 0) return '오늘';
  return days > 0 ? `D-${days}` : `${-days}일 지남`;
};
