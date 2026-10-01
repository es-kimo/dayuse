import { streakAfterToday } from '../utils/streak';
import React, { useMemo, useState } from 'react';
import type { ChallengeDetail, CalendarDailyRecordItem } from '../types';
import { StreakCalendar, StreakLegend, type DayStatus } from './dayu/StreakCalendar';
import { ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import { useRedayDeadlineTimer } from '../hooks/useRedayDeadlineTimer';
import { pickRedayUsableRecords, formatRedayRemaining, calculateRemainingSeconds } from '../utils/reday';
import { shiftCalendarMonth, recordCalendarStatus } from '../utils/recordCalendar';
import { Card } from './dayu/ui';
import { getTodayKstString } from '../utils/date';

interface MyRecordCardProps {
  challenge: ChallengeDetail;
  myRecords: CalendarDailyRecordItem[];
  streakCount: number;
  currentDayNumber: number;
  isTodayCompleted: boolean;
  redayUiEnabled?: boolean;
  onStartReday?: (recordId: number) => void;
}

export const MyRecordCard: React.FC<MyRecordCardProps> = ({
  challenge,
  myRecords,
  streakCount,
  currentDayNumber,
  isTodayCompleted,
  redayUiEnabled = false,
  onStartReday,
}) => {
  const todayStr = getTodayKstString();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const currentMonth = todayStr.slice(0, 7);
  const displayedMonth = selectedMonth ?? currentMonth;
  const [displayYear, displayMonth] = displayedMonth.split('-').map(Number);
  const todayDay = displayedMonth === currentMonth ? Number(todayStr.slice(8)) : undefined;

  // 가장 늦은 기한까지 갱신해 월 경계와 열린 화면의 기한 만료를 함께 처리한다.
  const lastDeadline = redayUiEnabled
    ? pickRedayUsableRecords(myRecords).map((record) => record.redayDeadline).filter((value): value is string => !!value).sort().at(-1)
    : undefined;
  useRedayDeadlineTimer(lastDeadline);
  const usableRecords = redayUiEnabled && onStartReday ? pickRedayUsableRecords(myRecords) : [];
  const usableByDate = new Map(usableRecords.map((record) => [record.date, record]));
  const nextReday = [...usableRecords].sort((a, b) => (a.redayDeadline ?? '').localeCompare(b.redayDeadline ?? ''))[0];
  const dateOf = (day: number) => `${displayedMonth}-${String(day).padStart(2, '0')}`;

  // 완료한 일수
  const doneCount = useMemo(() => {
    return myRecords.filter((r) => r.status === 'COMPLETED').length;
  }, [myRecords]);

  // 기록 맵
  const recordMap = useMemo(() => {
    const map = new Map<string, CalendarDailyRecordItem>();
    myRecords.forEach((r) => map.set(r.date, r));
    return map;
  }, [myRecords]);

  const statusOf = (day: number): DayStatus => recordCalendarStatus(
    dateOf(day), todayStr, challenge.startDate, challenge.endDate, recordMap.get(dateOf(day)),
  );

  return (
    <Card className="flex flex-col gap-3.5">
      {/* Title & Streak summary */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] text-slate-500 font-medium">
            내 기록 · {doneCount}/{currentDayNumber}일
          </div>
          <div className="text-[18px] font-extrabold text-slate-900 tracking-[-0.02em]">
            {streakCount > 0 ? `${streakCount}일째 이어가는 중` : '오늘부터 도전 시작!'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="이전 달" onClick={() => setSelectedMonth(shiftCalendarMonth(displayedMonth, -1))} className="grid size-9 place-items-center rounded-[10px] text-slate-500 hover:bg-slate-100"><ChevronLeft className="size-4" /></button>
          <span aria-live="polite" className="min-w-24 text-center text-[14.5px] font-bold tabular-nums text-slate-800">{displayYear}년 {displayMonth}월</span>
          <button type="button" aria-label="다음 달" onClick={() => setSelectedMonth(shiftCalendarMonth(displayedMonth, 1))} className="grid size-9 place-items-center rounded-[10px] text-slate-500 hover:bg-slate-100"><ChevronRight className="size-4" /></button>
        </div>
        {displayedMonth !== currentMonth && <button type="button" onClick={() => setSelectedMonth(null)} className="h-9 rounded-[10px] bg-slate-100 px-3 text-[13.5px] font-bold text-slate-800 hover:bg-slate-200">오늘</button>}
      </div>

      {/* Streak Calendar */}
      <div className="pt-1">
        <StreakCalendar
          year={displayYear}
          month={displayMonth}
          statusOf={statusOf}
          today={todayDay}
          redayOf={(day) => {
            if (usableByDate.has(dateOf(day))) return 'available';
            if (recordMap.get(dateOf(day))?.redayApplied) return 'applied';
            return undefined;
          }}
          onStartReday={(day) => {
            const record = usableByDate.get(dateOf(day));
            if (record && calculateRemainingSeconds(record.redayDeadline) > 0) onStartReday?.(record.id);
          }}
        />
      </div>

      {nextReday && (
        <button type="button" onClick={() => {
          if (nextReday.date.slice(0, 7) !== displayedMonth) setSelectedMonth(nextReday.date.slice(0, 7));
          else if (calculateRemainingSeconds(nextReday.redayDeadline) > 0) onStartReday?.(nextReday.id);
        }} className="flex items-center gap-2 text-left text-[12.5px] text-blue-600">
          <Ticket className="size-4 shrink-0" />
          <span>{Number(nextReday.date.slice(5, 7))}/{Number(nextReday.date.slice(8))} 리데이 가능 · {formatRedayRemaining(calculateRemainingSeconds(nextReday.redayDeadline))}{nextReday.date.slice(0, 7) !== displayedMonth ? ' · 날짜 보기' : ' · 사용하기'}</span>
          <ChevronRight className="ml-auto size-4 shrink-0" />
        </button>
      )}
      {myRecords.some((record) => record.date.startsWith(displayedMonth) && record.redayApplied) && <p className="flex items-center gap-1.5 text-[12.5px] text-slate-500"><Ticket className="size-3.5" />회색 티켓은 리데이 사용 완료 · 지각 기록은 유지돼요.</p>}

      {/* Footer: Legend & Next streak hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3.5 text-xs">
        <StreakLegend />
        <span className="text-[13px] text-slate-500 font-medium">
          {isTodayCompleted ? '오늘 인증 완료!' : `오늘 하면 ${streakAfterToday(myRecords, todayStr)}일 연속`}
        </span>
      </div>
    </Card>
  );
};
