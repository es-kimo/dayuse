import React, { useState } from 'react';
import type { GroupMember, ExecutionType, PeriodType } from '../types';
import { DayuAvatar } from './brand/DayuAvatar';
import { SubPageHeader } from './layout/SubPageHeader';
import { BottomActionBar } from './layout/BottomActionBar';

interface NewChallengeViewBProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  verificationCriteria: string;
  setVerificationCriteria: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  selectedPreset: number | 'custom';
  setSelectedPreset: (val: number | 'custom') => void;
  periodType: PeriodType;
  setPeriodType: (val: PeriodType) => void;
  targetFrequency: number;
  setTargetFrequency: (val: number) => void;
  executionType: ExecutionType;
  setExecutionType: (val: ExecutionType) => void;
  penaltyAmount: number;
  setPenaltyAmount: (val: number) => void;
  groupMembers: GroupMember[];
  selectedMemberIds: Set<number>;
  onToggleMember: (userId: number) => void;
  memberPenalties: Record<number, number>;
  onMemberPenaltyChange: (userId: number, amount: number) => void;
  durationDays: number;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onOpenHistory?: () => void;
  currentUserId?: number;
}

const CRITERIA_SUGGESTIONS = [
  '제출 성공 화면 캡처',
  '운동 기록 앱 캡처',
  '시계가 보이는 사진',
  '완독한 페이지 사진',
];

const PERIOD_PRESETS = [
  { label: '1주 (7일)', days: 7 },
  { label: '2주 (14일)', days: 14 },
  { label: '3주 (21일)', days: 21 },
  { label: '4주 (28일)', days: 28 },
];

export const NewChallengeViewB: React.FC<NewChallengeViewBProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  verificationCriteria,
  setVerificationCriteria,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedPreset,
  setSelectedPreset,
  periodType,
  setPeriodType,
  targetFrequency,
  setTargetFrequency,
  executionType,
  setExecutionType,
  penaltyAmount,
  setPenaltyAmount,
  groupMembers,
  selectedMemberIds,
  onToggleMember,
  memberPenalties: _memberPenalties,
  onMemberPenaltyChange: _onMemberPenaltyChange,
  durationDays,
  isSubmitting,
  onBack,
  onSubmit,
  onOpenHistory,
  currentUserId,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const canProceedStep1 = title.trim().length > 0 && verificationCriteria.trim().length > 0;
  const canProceedStep2 = durationDays > 0;

  const handleNext = () => {
    if (step === 1 && canProceedStep1) {
      setStep(2);
    } else if (step === 2 && canProceedStep2) {
      setStep(3);
    } else if (step === 3) {
      onSubmit();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    } else {
      onBack();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--page,#F8FAFC)] text-[var(--ink,#0F172A)] pb-28">
      {/* Top Header */}
      <SubPageHeader
        title="새 챌린지 만들기"
        onBack={handlePrev}
        rightAction={
          <span className="text-xs font-semibold text-slate-400 tabular-nums px-2">
            {step}/3
          </span>
        }
      />

      {/* 3 Steps indicator */}
      <div className="w-full max-w-[390px] mx-auto px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 grow">
          <div className={`h-1.5 rounded-full flex-1 transition-all ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          <div className={`h-1.5 rounded-full flex-1 transition-all ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          <div className={`h-1.5 rounded-full flex-1 transition-all ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />
        </div>
        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="text-[11px] font-semibold text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50 transition"
          >
            불러오기
          </button>
        )}
      </div>

      {/* Step Content */}
      <div className="w-full max-w-[390px] mx-auto p-4 space-y-5">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              어떤 챌린지인가요?
            </h2>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                챌린지 이름 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="예: 매일 1알고리즘 문제 풀기"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={40}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                설명 <span className="font-normal text-slate-400">(선택)</span>
              </label>
              <textarea
                placeholder="모임원들에게 목표나 규칙을 소개해 주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Verification Criteria */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                인증 기준 <span className="text-rose-500">*</span>
              </label>
              <textarea
                placeholder="어떤 사진이면 인증으로 인정할까요?"
                value={verificationCriteria}
                onChange={(e) => setVerificationCriteria(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CRITERIA_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setVerificationCriteria(sug)}
                    className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    {sug}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400 block">
                하루에 한 번 사진으로 인증할 수 있어요
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              기간과 빈도를 정해주세요
            </h2>

            {/* Period Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">인증 주기</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPeriodType('DAILY')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                    periodType === 'DAILY'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  매일 인증
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('WEEKLY_N')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                    periodType === 'WEEKLY_N'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  주 N회 인증
                </button>
              </div>
            </div>

            {periodType === 'WEEKLY_N' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">주당 목표 횟수</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setTargetFrequency(freq)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition ${
                        targetFrequency === freq
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {freq}회
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">진행 기간 ({durationDays}일간)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {PERIOD_PRESETS.map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(p.days);
                      const s = new Date(startDate);
                      const e = new Date(s);
                      e.setDate(e.getDate() + p.days - 1);
                      setEndDate(e.toISOString().slice(0, 10));
                    }}
                    className={`py-2 px-1 rounded-xl border text-[11px] font-bold text-center transition ${
                      selectedPreset === p.days
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">시작일</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">종료일</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              벌금 및 함께할 모임원
            </h2>

            {/* Execution Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">진행 방식</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExecutionType('INDIVIDUAL')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                    executionType === 'INDIVIDUAL'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  각자하기 (기본)
                </button>
                <button
                  type="button"
                  onClick={() => setExecutionType('TOGETHER')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                    executionType === 'TOGETHER'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  함께하기 (벌금 없음)
                </button>
              </div>
            </div>

            {executionType === 'INDIVIDUAL' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">미인증 1회당 벌금</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1000, 3000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPenaltyAmount(amt)}
                      className={`py-2 px-1 rounded-xl border text-xs font-bold text-center transition ${
                        penaltyAmount === amt
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {amt.toLocaleString()}원
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Group Members Selection */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  함께할 모임원 ({selectedMemberIds.size + 1}명)
                </label>
                <span className="text-[11px] text-slate-400">생성자는 기본 포함</span>
              </div>

              <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 p-2 max-h-48 overflow-y-auto">
                {groupMembers.map((m) => {
                  const isCreator = m.userId === currentUserId;
                  const isSelected = isCreator || selectedMemberIds.has(m.userId);

                  return (
                    <div
                      key={m.userId}
                      onClick={() => !isCreator && onToggleMember(m.userId)}
                      className={`py-2 px-2 flex items-center justify-between cursor-pointer rounded-lg transition ${
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <DayuAvatar profileImageUrl={m.profileImageUrl} size="sm" />
                        <span className="text-xs font-bold text-slate-800">
                          {m.nickname} {isCreator && '(나)'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isCreator}
                        onChange={() => {}}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Action */}
      <BottomActionBar>
        <button
          onClick={handleNext}
          disabled={(step === 1 && !canProceedStep1) || isSubmitting}
          className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] ${
            (step === 1 && !canProceedStep1) || isSubmitting
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
          }`}
        >
          {isSubmitting ? (
            <span>생성하는 중...</span>
          ) : step === 3 ? (
            <span>챌린지 개설 완료</span>
          ) : (
            <span>다음</span>
          )}
        </button>
      </BottomActionBar>
    </div>
  );
};
