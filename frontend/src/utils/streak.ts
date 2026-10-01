import { addDaysKst } from './date';

type StreakRecord = { date: string; status: string; isLate: boolean };
const completedOnTime = (record?: StreakRecord) => record?.status === 'COMPLETED' && !record.isLate;

/** 서버 StreakCalculator와 동일한 기준: 정상 인증만, 날짜 공백 없이, KST 09시 전 유예. */
export function calculateStreak(records: StreakRecord[], today: string, now: Date = new Date()): number {
  const byDate = new Map(records.map((record) => [record.date, record]));
  const yesterday = addDaysKst(today, -1);
  const yesterdayRecord = byDate.get(yesterday);
  const inGrace = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours() < 9
    && yesterdayRecord?.status !== 'FAILED';
  let date = completedOnTime(byDate.get(today)) ? today
    : completedOnTime(yesterdayRecord) ? yesterday
    : inGrace ? addDaysKst(today, -2) : yesterday;
  let count = 0;
  while (completedOnTime(byDate.get(date))) {
    count++;
    date = addDaysKst(date, -1);
  }
  return count;
}

/** 오늘 인증 뒤의 연속일은 단순 +1이 아니다. 어제 미인증/지각이면 오늘부터 새로 시작한다. */
export function streakAfterToday(records: StreakRecord[], today: string): number {
  return calculateStreak([
    ...records.filter((record) => record.date !== today),
    { date: today, status: 'COMPLETED', isLate: false },
  ], today);
}
