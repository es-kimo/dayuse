import React, { useEffect, useState } from 'react';
import { challengesApi } from '../api/challenges';
import { track } from '../utils/tracker';
import { useExperiment } from '../hooks/useExperiment';
import { useExperimentExposure } from '../hooks/useExperimentExposure';
import {
  CHALLENGE_INVITE_COPY_EXPERIMENT,
  resolveChallengeInviteCopy,
} from '../constants/experiments';
import { BottomSheet, BottomSheetTitle, BottomSheetDescription, BottomSheetClose } from './ui/BottomSheet';
import { Button, SheetGrab, TextField } from './dayu/ui';
import type { JoinPreviewResponse, StartDateType } from '../types';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Info,
} from 'lucide-react';

interface MidJoinBottomSheetProps {
  challengeId: number;
  /** 참여 이벤트 문맥용. 상세 화면이 알고 있는 모임 식별자를 그대로 내려받는다. */
  groupId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MidJoinBottomSheet: React.FC<MidJoinBottomSheetProps> = ({
  challengeId,
  groupId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [preview, setPreview] = useState<JoinPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 첫 Dayuse A/B Test (challenge-invite-copy-v1).
   *
   * 시트가 닫혀 있는 동안에는 조회하지 않는다(enabled=isOpen). 참여 화면을 열지도 않은 사용자를
   * 실험 배정 대상으로 계산할 이유가 없다. 문구는 미확정·미참여·오류일 때 항상 기본값(A)이므로
   * 실험 시스템이 죽어도 이 시트의 참여 흐름은 그대로 동작한다.
   */
  const inviteCopyExperiment = useExperiment(CHALLENGE_INVITE_COPY_EXPERIMENT, isOpen);
  const inviteCopy = resolveChallengeInviteCopy(inviteCopyExperiment);

  const [selectedType, setSelectedType] = useState<StartDateType>('TOMORROW');
  const [penaltyAmount, setPenaltyAmount] = useState<number>(5000);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await challengesApi.getJoinPreview(challengeId);
        setPreview(data);
        const defaultOpt = data.options.find((o) => o.isRecommended) || data.options[0];
        if (defaultOpt) {
          setSelectedType(defaultOpt.type);
        }
        if (data.executionType === 'TOGETHER') {
          setPenaltyAmount(0);
        } else {
          setPenaltyAmount(data.defaultPenaltyAmount || 5000);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || '참여 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [challengeId, isOpen]);

  /*
   * 배정 ≠ 노출. 시트가 열리고 참여 옵션까지 그려져 문구가 실제로 사용자 눈에 닿은 시점에만
   * experiment_exposed를 기록한다. 로딩 스피너만 보이는 동안은 노출이 아니다.
   */
  useExperimentExposure(inviteCopyExperiment, isOpen && !loading && preview !== null);

  /*
   * isOpen으로 조기 return하지 않는다.
   * 닫힐 때 바로 null을 반환하면 이탈 전환이 시작되기 전에 노드가 사라진다.
   * 닫힌 동안 내용이 렌더되지 않는 것은 BottomSheet(Base UI Portal)가 처리한다.
   */

  const selectedOption = preview?.options.find((o) => o.type === selectedType);
  const totalDays = selectedOption?.remainingDays || 0;
  const isTogether = preview?.executionType === 'TOGETHER';
  const maxPossiblePenalty = isTogether ? 0 : totalDays * penaltyAmount;

  const handleJoin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await challengesApi.joinChallenge(challengeId, {
        penaltyAmount: isTogether ? 0 : penaltyAmount,
        startDateType: selectedType,
      });
      // 참여 API가 성공해 실제로 합류한 뒤에만 기록한다.
      // Experiment Context는 실제 노출된 참여자일 때만 붙는다(tracker가 판별).
      track(
        'challenge_joined',
        {
          challengeId,
          groupId: groupId ?? null,
          startDateType: selectedType,
        },
        inviteCopyExperiment
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || '참여하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      disablePointerDismissal={submitting}
    >
      <>
        {/* 손잡이 · 헤더 */}
        <div className="flex shrink-0 flex-col gap-3.5 px-5 pt-2.5">
          <SheetGrab />
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <BottomSheetTitle className="text-[19px] font-extrabold text-slate-800">
                {preview?.isStarted ? '지금부터 함께해요' : '챌린지에 함께해요'}
              </BottomSheetTitle>
              <BottomSheetDescription className="mt-1 text-[13px] text-slate-500 break-words">
                {preview?.challengeTitle || '챌린지'}
              </BottomSheetDescription>
            </div>
            <BottomSheetClose
              disabled={submitting}
              aria-label="닫기"
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 focus-ring disabled:opacity-50"
            >
              <X className="size-[22px]" aria-hidden="true" />
            </BottomSheetClose>
          </div>
        </div>

        {/* 본문 */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-3.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <span className="text-[14px]">참여 정보를 불러오고 있어요...</span>
            </div>
          ) : error && !preview ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-[14px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : preview ? (
            <>
              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-[14px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/*
                초대 안내 문구 (A/B 실험: challenge-invite-copy-v1).
                Variant 확정 전에는 자리(높이)만 잡고 문구를 렌더하지 않는다. A를 먼저 보여준 뒤 B로 바꾸면
                B 그룹 사용자가 두 문구를 모두 본 셈이 되어 실험 결과가 오염된다.
              */}
              <div className="min-h-10 flex items-start gap-2 p-3 rounded-xl bg-slate-50 text-[13px] leading-relaxed text-slate-600">
                {inviteCopyExperiment.isReady && (
                  <>
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
                    <span>{inviteCopy}</span>
                  </>
                )}
              </div>

              {/* 시작일 선택 섹션 */}
              {preview.isStarted ? (
                <div>
                  <h3 className="text-[14px] font-bold text-slate-800 block mb-2">
                    언제부터 시작할까요?
                  </h3>
                  <div className="space-y-2">
                    {preview.options.map((option) => {
                      const isSelected = selectedType === option.type;
                      return (
                        <button
                          key={option.type}
                          type="button"
                          onClick={() => setSelectedType(option.type)}
                          aria-pressed={isSelected}
                          disabled={submitting}
                          className={`w-full cursor-pointer text-left p-3.5 rounded-[14px] border-[1.5px] transition-colors flex items-center justify-between gap-2 focus-ring disabled:opacity-50 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center transition ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[14px] font-bold text-slate-800">
                                  {option.type === 'TOMORROW' ? '내일부터 참여' : '오늘부터 참여'}
                                </span>
                                {option.isRecommended && (
                                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" /> 추천
                                  </span>
                                )}
                              </div>
                              <span className="text-[13px] text-slate-500 block mt-0.5">
                                {option.startDate}부터 함께해요
                              </span>
                            </div>
                          </div>
                          <span className="text-[14px] font-bold text-blue-600 shrink-0">
                            {option.remainingDays}일
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">함께할 기간</span>
                    <span className="text-[14px] font-bold text-slate-700">
                      {preview.challengeStartDate} ~ {preview.challengeEndDate} ({totalDays}일)
                    </span>
                  </div>
                </div>
              )}

              {/* 1일 약정 벌금 설정 섹션 */}
              {isTogether ? (
                <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-100 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[14px] font-bold text-indigo-900 block">벌금 없이 함께해요</span>
                    <span className="text-[13px] text-indigo-700 leading-relaxed block mt-0.5">
                      하루에 한 명만 인증해도 모두 함께 달성해요. 벌금은 없어요.
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="join-penalty-amount" className="text-[14px] font-bold text-slate-800 block mb-1.5">
                    하루 벌금
                  </label>
                  <p className="text-[13px] text-slate-500 mb-2.5">
                    인증에 실패하거나 인증을 하지 않은 날, 모임에 낼 금액이에요.
                  </p>

                  <div className="flex gap-2 mb-2">
                    {[3000, 5000, 10000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPenaltyAmount(amt)}
                        aria-pressed={penaltyAmount === amt}
                        disabled={submitting}
                        className={`flex-1 min-h-11 cursor-pointer text-[14px] rounded-xl border font-bold transition-colors focus-ring disabled:opacity-50 ${
                          penaltyAmount === amt
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {amt.toLocaleString()}원
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <TextField
                      id="join-penalty-amount"
                      disabled={submitting}
                      type="number"
                      min={0}
                      step={1000}
                      value={penaltyAmount}
                      onChange={(e) => setPenaltyAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">원</span>
                  </div>
                </div>
              )}

              {/* 요약 안내 카드 */}
              <div className="bg-slate-50 rounded-[14px] p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-slate-500">참여할 일수</span>
                  <span className="font-bold text-slate-800">{totalDays}일</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-slate-500">참여 전 기록</span>
                  <span className="font-medium text-slate-600">실패로 세지 않아요</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[13px] pt-2 border-t border-slate-200/60">
                  <span className="text-slate-700 font-semibold">
                    {isTogether ? '벌금' : '벌금 최대 금액'}
                  </span>
                  <span className={`text-[17px] tabular-nums font-extrabold ${isTogether ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {isTogether ? '없어요' : `${maxPossiblePenalty.toLocaleString()}원`}
                  </span>
                </div>
              </div>

              {!isTogether && (
                <p className="text-[13px] leading-relaxed text-slate-500">
                  참여하기 전 날짜에는 벌금이 없어요. 최대 금액은 참여하는 모든 날에 인증하지 않았을 때의 금액이에요.
                </p>
              )}

              {/* 정책 안내 */}
              <div className="flex items-start gap-1.5 text-[13px] leading-relaxed text-slate-500">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <span>
                  {isTogether
                    ? '선택한 시작일의 0시(한국 시간) 전까지 참여를 취소할 수 있어요. 시작한 뒤에는 취소할 수 없어요.'
                    : '선택한 시작일의 0시(한국 시간) 전까지 참여 취소와 벌금 변경이 가능해요. 시작한 뒤에는 바꿀 수 없어요.'}
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* 푸터 액션 */}
        <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting} className="flex-1">
            취소
          </Button>
          <Button
            type="button"
            onClick={handleJoin}
            disabled={submitting || loading || !preview}
            className="flex-2"
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {submitting ? '참여하고 있어요...' : '함께 시작하기'}
          </Button>
        </div>
      </>
    </BottomSheet>
  );
};
