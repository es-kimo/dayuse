import type { CalendarDailyRecordItem } from '../types';
import type { DayStatus } from '../components/dayu/StreakCalendar';

/** YYYY-MM 기준 월 이동. 브라우저 시간대와 무관하게 연도 경계를 처리한다. */
export function shiftCalendarMonth(month: string, offset: number): string {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function recordCalendarStatus(
  date: string, today: string, start: string, end: string,
  record?: CalendarDailyRecordItem,
): DayStatus {
  if (date < start || date > end || record?.status === 'NOT_PARTICIPATED') return 'none';
  if (record?.status === 'COMPLETED') return 'done';
  if (date === today) return 'wait';
  return date < today ? 'miss' : 'future';
}
