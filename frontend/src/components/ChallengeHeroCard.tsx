import React from 'react';
import type { ChallengeDetail } from '../types';
import { Dayu } from './dayu/DayuAvatar';

interface ChallengeHeroCardProps {
  challenge: ChallengeDetail;
  dDay: string;
  totalDurationDays: number;
  currentDayNumber: number;
  progressPercent: number;
  remainingDays: number;
  isTodayCompleted: boolean;
}

export const ChallengeHeroCard: React.FC<ChallengeHeroCardProps> = ({
  challenge,
  dDay,
  currentDayNumber,
  progressPercent,
  remainingDays,
  isTodayCompleted,
}) => {
  const startDateObj = new Date(challenge.startDate);
  const startMonthStr = `${startDateObj.getMonth() + 1}월 ${startDateObj.getDate()}일`;
  const endDateObj = new Date(challenge.endDate);
  const endMonthStr = `${endDateObj.getMonth() + 1}월 ${endDateObj.getDate()}일`;

  const getStatusChip = () => {
    switch (challenge.status) {
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-[7px] text-xs font-bold bg-emerald-50 text-emerald-700 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
            진행 중
          </span>
        );
      case 'NOT_STARTED':
        return (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-[7px] text-xs font-bold bg-amber-50 text-amber-700 whitespace-nowrap">
            시작 전
          </span>
        );
      case 'ENDED':
        return (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-[7px] text-xs font-bold bg-slate-100 text-slate-600 whitespace-nowrap">
            종료
          </span>
        );
      case 'ABORTED':
        return (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-[7px] text-xs font-bold bg-rose-50 text-rose-600 whitespace-nowrap">
            중단됨
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-[7px] text-xs font-bold bg-slate-100 text-slate-600 whitespace-nowrap">
            {challenge.status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-[22px] bg-blue-50 border border-blue-100 p-[18px_18px_16px] flex flex-col gap-3">
      {/* Upper Chips & D-Day */}
      <div className="flex items-center gap-1.5">
        {getStatusChip()}
        <span className="inline-flex items-center h-6 px-2 rounded-[7px] text-xs font-bold bg-white text-slate-600 border border-blue-100 whitespace-nowrap">
          {challenge.executionType === 'TOGETHER' ? '함께하기' : '각자하기'}
        </span>
        {dDay && (
          <span className="ml-auto inline-flex items-center font-extrabold text-[13px] text-blue-600 bg-white border border-blue-100 px-2.5 py-1 rounded-lg tabular-nums leading-none">
            {dDay}
          </span>
        )}
      </div>

      {/* Main Title, Group Info, Dayu Mascot */}
      <div className="flex items-end justify-between gap-2 pt-0.5">
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] leading-[1.28] font-extrabold tracking-[-0.03em] text-slate-900 break-keep">
            {challenge.title}
          </h1>
          <p className="mt-1.5 text-[13px] text-slate-600 truncate">
            {challenge.groupName || '스터디'} · {challenge.creatorNickname || '모임원'}이 만들었어요
          </p>
        </div>
        <div className="shrink-0 -mr-1 -mb-1">
          <Dayu
            color="#2563EB"
            face={isTodayCompleted ? 'done' : 'cheer'}
            size={64}
            title={isTodayCompleted ? '완료한 데이유' : '응원하는 데이유'}
          />
        </div>
      </div>

      {/* Progress Track & Period Info */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="relative h-2 rounded-full bg-white">
          <i
            className="block h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
          <b
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-[3px] border-blue-600 shadow-xs pointer-events-none transition-all duration-500"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11.5px] text-slate-500 tabular-nums">
          <span>{startMonthStr}</span>
          <span>
            <strong className="text-slate-800 font-bold">{currentDayNumber}일째</strong> · 완주까지 {remainingDays}일
          </span>
          <span>{endMonthStr}</span>
        </div>
      </div>
    </div>
  );
};
