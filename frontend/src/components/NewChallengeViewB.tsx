import React, { useState } from 'react';
import type { GroupMember, ExecutionType, PeriodType } from '../types';
import { DayuAvatar } from './brand/DayuAvatar';
import { SubPageHeader } from './layout/SubPageHeader';
import { BottomActionBar } from './layout/BottomActionBar';
import { Check, History, Info } from 'lucide-react';
import {
  Button,
  ChoiceCard,
  Field,
  Pill,
  Segmented,
  StepBar,
  TextAreaField,
  TextField,
} from './dayu/ui';

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
  redayAllowed: boolean;
  setRedayAllowed: (val: boolean) => void;
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
  redayAllowed,
  setRedayAllowed,
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

  const canEnableReday = periodType === 'DAILY' && executionType === 'INDIVIDUAL' && penaltyAmount > 0;
  const effectiveRedayAllowed = canEnableReday && redayAllowed;

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
    <div className="flex min-h-dvh flex-col bg-slate-50 pb-action-bar text-slate-800">
      {/* Top Header */}
      <SubPageHeader
        title="새 챌린지 만들기"
        onBack={handlePrev}
        rightAction={<span className="pr-2 text-[13px] tabular-nums text-slate-500">{step}/3</span>}
      />

      {/* 3 Steps indicator */}
      <div className="mx-auto w-full max-w-app bg-slate-50 px-4 pb-2">
        <StepBar step={step} />
      </div>

      {/* Step Content */}
      <div className="mx-auto flex w-full max-w-app flex-col gap-[18px] px-4 pt-2.5">
        {step === 1 && (
          <>
            <div className="flex h-9 items-center justify-between gap-2">
              <h2 className="text-[21px] font-extrabold tracking-[-0.02em] text-slate-800">어떤 챌린지인가요?</h2>
              {onOpenHistory && (
                <Button size="sm" variant="ghost" className="shrink-0" onClick={onOpenHistory}>
                  <History className="size-4" />
                  지난 챌린지 불러오기
                </Button>
              )}
            </div>

            <Field label="챌린지 이름" htmlFor="ch-title" required>
              <TextField
                id="ch-title"
                type="text"
                placeholder="예: 매일 1알고리즘 문제 풀기"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={40}
              />
            </Field>

            <Field label="설명" htmlFor="ch-desc" optional>
              <TextAreaField
                id="ch-desc"
                placeholder="모임원들에게 목표나 규칙을 소개해 주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <Field label="인증 기준" htmlFor="ch-criteria" required help="하루에 한 번 사진으로 인증할 수 있어요">
              <TextAreaField
                id="ch-criteria"
                placeholder="어떤 사진이면 인증으로 인정할까요?"
                value={verificationCriteria}
                onChange={(e) => setVerificationCriteria(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {CRITERIA_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setVerificationCriteria(sug)}
                    className="h-[34px] cursor-pointer rounded-[10px] border border-dashed border-slate-200 bg-white px-3 text-[13.5px] font-semibold whitespace-nowrap text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-[21px] font-extrabold tracking-[-0.02em] text-slate-800">언제, 얼마나 할까요?</h2>

            <Field label={`기간`}>
              <div className="flex flex-wrap gap-1.5">
                {PERIOD_PRESETS.map((p) => (
                  <Pill
                    key={p.days}
                    active={selectedPreset === p.days}
                    onClick={() => {
                      setSelectedPreset(p.days);
                      const s = new Date(startDate);
                      const e = new Date(s);
                      e.setDate(e.getDate() + p.days - 1);
                      setEndDate(e.toISOString().slice(0, 10));
                    }}
                  >
                    {p.label}
                  </Pill>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5 text-[13px] text-slate-600">
                <span>
                  {startDate} ~ {endDate}
                </span>
                <b className="font-bold text-slate-800">{durationDays}일</b>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="시작일" htmlFor="ch-start">
                  <TextField
                    id="ch-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setSelectedPreset('custom');
                    }}
                  />
                </Field>
                <Field label="종료일" htmlFor="ch-end">
                  <TextField
                    id="ch-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setSelectedPreset('custom');
                    }}
                  />
                </Field>
              </div>
            </Field>

            <Field label="주기">
              <Segmented
                label="인증 주기"
                value={periodType}
                onChange={setPeriodType}
                options={[
                  { value: 'DAILY', label: '매일' },
                  { value: 'WEEKLY_N', label: '주 N회' },
                ]}
              />
              {periodType === 'WEEKLY_N' && (
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((freq) => (
                    <Pill key={freq} active={targetFrequency === freq} onClick={() => setTargetFrequency(freq)}>
                      {freq}회
                    </Pill>
                  ))}
                </div>
              )}
            </Field>

            <Field label="방식">
              <div className="flex gap-2">
                <ChoiceCard
                  active={executionType === 'INDIVIDUAL'}
                  onClick={() => setExecutionType('INDIVIDUAL')}
                  title="각자하기"
                  desc="각자 목표를 채우고, 못 한 날은 각자 약정 금액을 내요"
                />
                <ChoiceCard
                  active={executionType === 'TOGETHER'}
                  onClick={() => setExecutionType('TOGETHER')}
                  title="함께하기"
                  desc="하루에 한 명만 인증해도 모두 성공. 벌금 없이 가볍게"
                />
              </div>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-[21px] font-extrabold tracking-[-0.02em] text-slate-800">누구와 함께할까요?</h2>

            {executionType === 'INDIVIDUAL' && (
              <Field label="못 한 날 약정 금액" help="모든 참여자에게 똑같이 적용돼요">
                <div className="flex flex-wrap gap-1.5">
                  {[1000, 3000, 5000, 10000].map((amt) => (
                    <Pill key={amt} active={penaltyAmount === amt} onClick={() => setPenaltyAmount(amt)}>
                      {amt.toLocaleString()}원
                    </Pill>
                  ))}
                </div>
              </Field>
            )}

            <Field
              label="리데이 (벌금 면제권)"
              help={
                canEnableReday
                  ? '익일 오전 9시~이틀 뒤 오전 9시 전 지각 인증 후 리데이 티켓을 쓰면 해당 날 벌금이 면제돼요'
                  : '매일 · 각자하기 · 벌금이 있는 챌린지에서만 리데이를 사용할 수 있어요'
              }
            >
              {canEnableReday ? (
                <div className="flex gap-2">
                  <ChoiceCard
                    active={!effectiveRedayAllowed}
                    onClick={() => setRedayAllowed(false)}
                    title="미허용"
                    desc="지각 인증을 해도 약정 벌금이 그대로 부과돼요"
                  />
                  <ChoiceCard
                    active={effectiveRedayAllowed}
                    onClick={() => setRedayAllowed(true)}
                    title="허용"
                    desc="지각 인증 후 리데이 티켓을 쓰면 벌금을 면제받아요"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-[13px] text-slate-500">
                  주 N회 · 함께하기 · 무벌금 챌린지에서는 리데이가 적용되지 않아요.
                </div>
              )}
            </Field>

            <Field
              label={
                <>
                  함께할 모임원 <span className="font-normal text-slate-500">· 나 포함 {selectedMemberIds.size + 1}명</span>
                </>
              }
            >
              <div className="flex flex-col gap-1.5">
                {groupMembers.map((m) => {
                  const isCreator = m.userId === currentUserId;
                  const isSelected = isCreator || selectedMemberIds.has(m.userId);

                  return (
                    <button
                      key={m.userId}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={isCreator}
                      onClick={() => !isCreator && onToggleMember(m.userId)}
                      className={`flex items-center gap-2.5 rounded-[14px] border-[1.5px] px-[13.5px] py-[11.5px] text-left transition-colors ${
                        isSelected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      } ${isCreator ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <DayuAvatar profileImageUrl={m.profileImageUrl} size={36} />
                      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                        <span className="truncate text-[14.5px] font-bold text-slate-800">{m.nickname}</span>
                        {isCreator && <span className="shrink-0 text-[13px] text-slate-500">나 · 필수</span>}
                      </span>
                      <span
                        aria-hidden
                        className={`grid size-[22px] shrink-0 place-items-center rounded-[7px] border-[1.5px] ${
                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="size-3.5 stroke-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="flex flex-col gap-2 rounded-[18px] bg-slate-100 p-4 text-[13.5px]">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">챌린지</span>
                <b className="truncate text-right font-bold text-slate-800">{title || '-'}</b>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">기간</span>
                <b className="text-right font-bold text-slate-800">
                  {startDate} ~ {endDate} · {durationDays}일
                </b>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">주기 · 방식</span>
                <b className="text-right font-bold text-slate-800">
                  {periodType === 'DAILY' ? '매일' : `주 ${targetFrequency}회`} ·{' '}
                  {executionType === 'INDIVIDUAL' ? '각자하기' : '함께하기'}
                </b>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">약정</span>
                <b className="text-right font-bold text-slate-800">
                  {executionType === 'INDIVIDUAL' ? `하루 ${penaltyAmount.toLocaleString()}원` : '없음'}
                </b>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">리데이</span>
                <b className="text-right font-bold text-slate-800">
                  {effectiveRedayAllowed ? '허용 (벌금 면제권 사용 가능)' : '미허용'}
                </b>
              </div>
            </div>

            <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-[13px] text-[13px] leading-[1.5] text-amber-900">
              <Info className="mt-px size-4 shrink-0" />
              <span>만들고 나면 참여자와 인증 기준은 바꿀 수 없어요.</span>
            </div>
          </>
        )}
      </div>

      {/* Floating Bottom Action */}
      <BottomActionBar className="flex gap-2.5">
        {step > 1 && (
          <Button variant="ghost" size="lg" className="w-24 shrink-0" onClick={handlePrev}>
            이전
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1"
          onClick={handleNext}
          disabled={(step === 1 && !canProceedStep1) || isSubmitting}
        >
          {isSubmitting ? '만드는 중...' : step === 3 ? '챌린지 만들기' : '다음'}
        </Button>
      </BottomActionBar>
    </div>
  );
};
