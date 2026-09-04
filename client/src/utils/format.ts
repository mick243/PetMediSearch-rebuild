import dayjs from 'dayjs';

export const formatDate = (date: string, format?: string) => {
  return dayjs(date).format(format ? format : 'YY.MM.DD');
};
