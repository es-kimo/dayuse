import { describe, expect, it } from 'vitest';
import { calculateStreak, streakAfterToday } from './streak';

const today = '2026-10-01';
const noon = new Date('2026-10-01T12:00:00+09:00');
const done = (date: string, isLate = false) => ({ date, status: 'COMPLETED', isLate });

describe('상세 연속 인증 계산', () => {
  it('어제가 리데이 가능 지각 인증이면 0일이며 오늘 정상 인증하면 1일이다', () => {
    const records = [done('2026-09-30', true)];
    expect(calculateStreak(records, today, noon)).toBe(0);
    expect(streakAfterToday(records, today)).toBe(1);
  });
  it('리데이로 벌금이 면제되어도 지각 인증은 연속일을 복구하지 않는다', () => {
    const records = [{ ...done('2026-09-30', true), redayApplied: true }];
    expect(calculateStreak(records, today, noon)).toBe(0);
  });
  it('정상 인증은 월 경계를 넘어 이어진다', () => {
    const records = [done('2026-09-29'), done('2026-09-30')];
    expect(calculateStreak(records, today, noon)).toBe(2);
    expect(streakAfterToday(records, today)).toBe(3);
  });
  it('오늘 인증했으면 오늘부터 세고 중간 날짜가 빠지면 끊는다', () => {
    expect(calculateStreak([done(today), done('2026-09-29')], today, noon)).toBe(1);
    expect(calculateStreak([done('2026-09-29')], today, noon)).toBe(0);
  });
  it('NOT_PARTICIPATED를 건너뛰어 연속일을 합치지 않는다', () => {
    expect(calculateStreak([done('2026-09-30'), { date: '2026-09-29', status: 'NOT_PARTICIPATED', isLate: false }, done('2026-09-28')], today, noon)).toBe(1);
  });
  it('KST 09시 전에는 어제 미인증의 유예를 적용하지만 오늘 예상 기록은 따로 계산한다', () => {
    const records = [done('2026-09-29'), done('2026-09-28')];
    expect(calculateStreak(records, today, new Date('2026-10-01T08:59:59+09:00'))).toBe(2);
    expect(calculateStreak(records, today, new Date('2026-10-01T09:00:00+09:00'))).toBe(0);
    expect(streakAfterToday(records, today)).toBe(1);
  });
  it('어제 실패가 확정됐으면 심야 유예도 적용하지 않는다', () => {
    expect(calculateStreak([done('2026-09-29'), { date: '2026-09-30', status: 'FAILED', isLate: false }], today, new Date('2026-10-01T08:00:00+09:00'))).toBe(0);
  });
  it('기록이 없거나 미래 기록만 있으면 0일이다', () => {
    expect(calculateStreak([], today, noon)).toBe(0);
    expect(calculateStreak([done('2026-10-02')], today, noon)).toBe(0);
  });
});
