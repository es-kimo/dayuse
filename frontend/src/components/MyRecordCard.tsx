import React, { useMemo } from 'react';
import type { ChallengeDetail, CalendarDailyRecordItem } from '../types';
import { StreakCalendar, StreakLegend, type DayStatus } from './dayu/StreakCalendar';
import { Card } from './dayu/ui';
import { getTodayKstString } from '../utils/date';

interface MyRecordCardProps {
  challenge: ChallengeDetail;
  myRecords: CalendarDailyRecordItem[];
  streakCount: number;
  currentDayNumber: number;
  isTodayCompleted: boolean;
}

export const MyRecordCard: React.FC<MyRecordCardProps> = ({
  challenge,
  myRecords,
  streakCount,
  currentDayNumber,
  isTodayCompleted,
}) => {
  const todayStr = getTodayKstString();
  const todayDateObj = new Date(todayStr);

  // 달력 표시 기준 연/월: 현재 진행 중인 경우 이번 달, 아니면 챌린지 시작 연/월
  const displayYear = todayDateObj.getFullYear();
  const displayMonth = todayDateObj.getMonth() + 1; // 1~12

  // 이번 달 오늘 날짜
  const todayDay = todayDateObj.getDate();

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

  const statusOf = (day: number): DayStatus => {
    const dateStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rec = recordMap.get(dateStr);

    if (rec?.status === 'COMPLETED') {
      return 'done';
    }

    if (dateStr === todayStr) {
      return isTodayCompleted ? 'done' : 'wait';
    }

    if (dateStr < todayStr) {
      if (dateStr >= challenge.startDate && dateStr <= challenge.endDate) {
        return 'miss';
      }
      return 'none';
    }

    if (dateStr > todayStr && dateStr <= challenge.endDate) {
      return 'future';
    }

    return 'none';
  };

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

      {/* Streak Calendar */}
      <div className="pt-1">
        <StreakCalendar
          year={displayYear}
          month={displayMonth}
          statusOf={statusOf}
          today={todayDay}
        />
      </div>

      {/* Footer: Legend & Next streak hint */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3.5 text-xs">
        <StreakLegend />
        <span className="text-[13px] text-slate-500 font-medium">
          {isTodayCompleted ? '오늘 인증 완료!' : `오늘 하면 ${streakCount + 1}일 연속`}
        </span>
      </div>
    </Card>
  );
};
