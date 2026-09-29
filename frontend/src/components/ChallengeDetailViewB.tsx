import React from 'react';
import type { ChallengeDetail, ChallengeCalendarResponse, ParticipantCalendarItem, CalendarDailyRecordItem } from '../types';
import { DayuAvatar } from './brand/DayuAvatar';
import {
  ArrowLeft,
  Camera,
  Check,
  Share2,
  MoreVertical,
  Repeat,
  Lock,
  Users,
} from 'lucide-react';
import { Menu, MenuTrigger, MenuPopup, MenuItem } from './ui/Menu';

interface ChallengeDetailViewBProps {
  challenge: ChallengeDetail;
  calendarData: ChallengeCalendarResponse | null;
  dDay: string;
  totalDurationDays: number;
  currentDayNumber: number;
  progressPercent: number;
  remainingDays: number;
  isTodayCompleted: boolean;
  streakCount: number;
  calendarMonthDays: Array<{
    dayNumber: number;
    dateStr: string;
    status: 'BLANK' | 'DONE' | 'MISS' | 'WAIT_NOW' | 'FUTURE';
  }>;
  onBack: () => void;
  onShare: () => void;
  onOpenCert: () => void;
  onAbortChallenge?: () => void;
  onDeleteChallenge?: () => void;
  onOpenMidJoin?: () => void;
  onRestartChallenge?: () => void;
}

export const ChallengeDetailViewB: React.FC<ChallengeDetailViewBProps> = ({
  challenge,
  calendarData,
  dDay,
  totalDurationDays,
  currentDayNumber,
  progressPercent,
  remainingDays,
  isTodayCompleted,
  streakCount,
  calendarMonthDays,
  onBack,
  onShare,
  onOpenCert,
  onAbortChallenge,
  onDeleteChallenge,
  onOpenMidJoin,
  onRestartChallenge,
}) => {
  const startDateObj = new Date(challenge.startDate);
  const startMonthStr = `${startDateObj.getMonth() + 1}월 ${startDateObj.getDate()}일`;
  const endDateObj = new Date(challenge.endDate);
  const endMonthStr = `${endDateObj.getMonth() + 1}월 ${endDateObj.getDate()}일`;

  const totalParticipantsCount = calendarData?.participants.length || 1;
  const todayCertifiedCount = calendarData?.participants.filter((p: ParticipantCalendarItem) => {
    return p.records?.some((r: CalendarDailyRecordItem) => r.date === new Date().toISOString().slice(0, 10) && r.status === 'COMPLETED');
  }).length || 0;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--page,#F8FAFC)] text-[var(--ink,#0F172A)] pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 h-12 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <button
          onClick={onBack}
          aria-label="뒤로"
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg active:scale-95 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="font-bold text-base text-slate-800">챌린지</div>
        <div className="flex items-center gap-1">
          <button
            onClick={onShare}
            aria-label="공유"
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg active:scale-95 transition"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {(challenge.isCreator || challenge.canAbort) && (
            <Menu>
              <MenuTrigger
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg active:scale-95 transition"
                aria-label="더보기"
              >
                <MoreVertical className="w-5 h-5" />
              </MenuTrigger>
              <MenuPopup sideOffset={6}>
                {challenge.canAbort && onAbortChallenge && (
                  <MenuItem
                    onSelect={onAbortChallenge}
                    className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    챌린지 중단
                  </MenuItem>
                )}
                {challenge.isCreator && onDeleteChallenge && (
                  <MenuItem
                    onSelect={onDeleteChallenge}
                    className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    챌린지 삭제
                  </MenuItem>
                )}
                {onOpenMidJoin && (
                  <MenuItem onSelect={onOpenMidJoin} className="cursor-pointer">
                    중도 참여 코드
                  </MenuItem>
                )}
                {onRestartChallenge && (
                  <MenuItem onSelect={onRestartChallenge} className="cursor-pointer">
                    새 회차로 이어하기
                  </MenuItem>
                )}
              </MenuPopup>
            </Menu>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="p-4 space-y-4">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full font-bold bg-white/20 text-white backdrop-blur-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                진행 중
              </span>
              <span className="px-2 py-0.5 rounded-full font-medium bg-white text-blue-700">
                {challenge.executionType === 'TOGETHER' ? '함께하기' : '각자하기'}
              </span>
            </div>
            <span className="font-extrabold text-sm tracking-tight bg-white/10 px-2.5 py-0.5 rounded-full">
              {dDay}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-extrabold leading-snug whitespace-pre-line tracking-tight">
                {challenge.title}
              </h1>
              <p className="text-xs text-blue-100 opacity-90">
                {challenge.groupName || '스터디'} · 참여자 {totalParticipantsCount}명
              </p>
            </div>
            <div className="shrink-0 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center p-1">
              <DayuAvatar size="lg" className="w-14 h-14" />
            </div>
          </div>

          {/* Progress Bar & Day Label */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-black/20 rounded-full h-2 relative overflow-hidden">
              <div
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-blue-100 font-medium">
              <span>{startMonthStr}</span>
              <span>
                <strong className="text-white font-bold">{currentDayNumber}일째</strong> · 완주까지 {remainingDays}일
              </span>
              <span>{endMonthStr}</span>
            </div>
          </div>
        </div>

        {/* 1. 내 기록 & 캘린더 그리드 Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500">
                내 기록 · {currentDayNumber}일 중
              </div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight">
                {streakCount > 0 ? `${streakCount}일째 이어가는 중` : '오늘부터 도전 시작!'}
              </div>
            </div>
            {isTodayCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Check className="w-3.5 h-3.5" /> 오늘 완료
              </span>
            )}
          </div>

          {/* 월간 캘린더 그리드 */}
          <div className="pt-2">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-1.5">
              <span>일</span>
              <span>월</span>
              <span>화</span>
              <span>수</span>
              <span>목</span>
              <span>금</span>
              <span>토</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarMonthDays.map((item, idx) => {
                if (item.status === 'BLANK') {
                  return <div key={`blank-${idx}`} className="h-9" />;
                }

                let bgClass = 'bg-slate-50 text-slate-400 border border-slate-100';
                if (item.status === 'DONE') {
                  bgClass = 'bg-blue-600 text-white font-bold shadow-xs';
                } else if (item.status === 'MISS') {
                  bgClass = 'bg-rose-100 text-rose-500 font-bold border border-rose-200';
                } else if (item.status === 'WAIT_NOW') {
                  bgClass = 'bg-blue-50 text-blue-600 font-extrabold border-2 border-blue-500 ring-2 ring-blue-100';
                }

                return (
                  <div
                    key={`day-${item.dayNumber}`}
                    className={`h-9 rounded-xl flex items-center justify-center text-xs transition active:scale-95 ${bgClass}`}
                  >
                    <span>{item.dayNumber}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                인증
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-rose-200 border border-rose-300 inline-block" />
                놓친 날
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-blue-100 border border-blue-500 inline-block" />
                오늘
              </span>
            </div>
            <span className="text-slate-600 font-medium">
              {isTodayCompleted ? '오늘 인증 완료!' : `오늘 하면 ${streakCount + 1}일 연속`}
            </span>
          </div>
        </div>

        {/* 2. 이렇게 인증해요 Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
            <Check className="w-4 h-4 text-blue-600" />
            <span>이렇게 인증해요</span>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-sm text-slate-800 leading-snug">
                {challenge.verificationCriteria || '인증 기준에 맞게 사진을 등록해 주세요'}
              </div>
              {challenge.description && (
                <div className="text-xs text-slate-500 line-clamp-2">
                  {challenge.description}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
              <Repeat className="w-3.5 h-3.5 text-slate-500" />
              {challenge.periodType === 'DAILY' ? '매일 1회' : `주 ${challenge.targetFrequency}회`}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
              못 한 날 {challenge.myPenaltyAmount?.toLocaleString() || '1,000'}원
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>시작한 뒤에는 참여자와 규칙을 바꿀 수 없어요</span>
          </div>
        </div>

        {/* 3. 함께하는 모임원 Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
              <Users className="w-4 h-4 text-blue-600" />
              <span>함께하는 {totalParticipantsCount}명</span>
            </div>
            <span className="text-xs font-semibold text-blue-600">
              오늘 {todayCertifiedCount}명 인증
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {calendarData?.participants.map((p: ParticipantCalendarItem) => {
              const isPCompletedToday = p.records?.some(
                (r: CalendarDailyRecordItem) => r.date === new Date().toISOString().slice(0, 10) && r.status === 'COMPLETED'
              );
              const doneCount = p.records?.filter((r: CalendarDailyRecordItem) => r.status === 'COMPLETED').length || 0;
              const participantProgress = Math.round((doneCount / totalDurationDays) * 100);

              const chParticipant = challenge.participants.find((cp) => cp.userId === p.userId);
              const pPenalty = chParticipant?.penaltyAmount ?? challenge.myPenaltyAmount ?? 0;

              return (
                <div key={p.userId} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <DayuAvatar
                      profileImageUrl={p.profileImageUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {p.nickname}
                        </span>
                        {isPCompletedToday && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            오늘 인증
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, participantProgress)}%` }}
                          />
                        </div>
                        <span>{participantProgress}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">벌금</span>
                    <span className="text-xs font-bold text-slate-700">
                      {pPenalty.toLocaleString()}원
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30">
        <button
          onClick={onOpenCert}
          disabled={isTodayCompleted}
          className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] ${
            isTodayCompleted
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
          }`}
        >
          {isTodayCompleted ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span>오늘 인증 완료</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>오늘 인증하기</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
