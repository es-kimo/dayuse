import { describe, expect, it } from 'vitest';
import { shiftCalendarMonth, recordCalendarStatus } from './recordCalendar';
import type { CalendarDailyRecordItem } from '../types';

describe('달력 월 이동', () => {
  it.each([
    ['2026-01', -1, '2025-12'],
    ['2026-12', 1, '2027-01'],
    ['2024-03', -1, '2024-02'],
  ])('%s에서 %i개월 이동하면 %s다', (month, offset, expected) => {
    expect(shiftCalendarMonth(month, offset)).toBe(expected);
  });
});

describe('달력 기록 상태', () => {
  const status = (date: string, record?: CalendarDailyRecordItem) =>
    recordCalendarStatus(date, '2026-10-01', '2026-09-20', '2026-10-10', record);
  it('지난달 기록과 이번 달 오늘을 구별한다', () => {
    expect(status('2026-09-30')).toBe('miss');
    expect(status('2026-10-01')).toBe('wait');
    expect(status('2026-10-02')).toBe('future');
  });
  it('기간 밖 오늘과 시작 전 미래 날짜에 인증 대기를 표시하지 않는다', () => {
    expect(recordCalendarStatus('2026-10-01', '2026-10-01', '2026-10-05', '2026-10-10')).toBe('none');
    expect(recordCalendarStatus('2026-10-03', '2026-10-01', '2026-10-05', '2026-10-10')).toBe('none');
    expect(status('2026-10-11')).toBe('none');
  });
  it('참여 전 기록을 실패로 표시하지 않는다', () => {
    expect(status('2026-09-30', { status: 'NOT_PARTICIPATED' } as CalendarDailyRecordItem)).toBe('none');
  });
  it('리데이 사용 여부와 별개로 완료된 인증을 유지한다', () => {
    expect(status('2026-09-30', { status: 'COMPLETED', isLate: true, redayApplied: true } as CalendarDailyRecordItem)).toBe('done');
  });
});
