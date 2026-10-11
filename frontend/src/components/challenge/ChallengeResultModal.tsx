import { DayuExpression } from '../brand/DayuExpression';
import { BottomSheet, BottomSheetTitle, BottomSheetDescription, BottomSheetClose } from '../ui/BottomSheet';
import { SheetGrab, Button, Card, Chip } from '../dayu/ui';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Coins,
  Clock,
  ArrowRight,
  PlusCircle,
  Receipt,
} from 'lucide-react';
import { challengeResultApi } from '../../api/challengeResult';
import { useAuth } from '../../context/AuthContext';
import { useChallengeResultAcknowledgment } from '../../hooks/useChallengeResultAcknowledgment';
import { getResultSentiment } from '../../utils/challengeResultSentiment';
import type { ChallengeResultDetail } from '../../types';

export interface ChallengeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  challengeId: number;
  onAcknowledged?: () => void;
}

export const ChallengeResultModal: React.FC<ChallengeResultModalProps> = ({
  isOpen,
  onClose,
  groupId,
  challengeId,
  onAcknowledged,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<ChallengeResultDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadResult() {
      try {
        setLoading(true);
        setError(null);
        const data = await challengeResultApi.getResult(groupId, challengeId);
        if (isMounted) {
          setResult(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : '결과를 불러오지 못했습니다.';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadResult();
    return () => {
      isMounted = false;
    };
  }, [isOpen, groupId, challengeId]);

  const myParticipantResult =
    result?.participants.find((p) => p.userId === user?.id) || null;

  const { isRevised, shouldCelebrate } = useChallengeResultAcknowledgment({
    groupId,
    challengeId,
    result,
    myParticipantResult,
    onAcknowledged: (updated) => {
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.userId === updated.userId ? updated : p
          ),
        };
      });
      onAcknowledged?.();
    },
  });

  const sentiment = getResultSentiment({
    status: result?.status ?? 'PROVISIONAL',
    isSuccess: myParticipantResult?.isSuccess ?? false,
    completedCount: myParticipantResult?.completedCount ?? 0,
    targetCount: myParticipantResult?.targetCount ?? 0,
    abortReason: result?.abortReason,
    isRevised,
  });

  return (
    <BottomSheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <>
        <div className="shrink-0 px-5 pt-2.5 pb-4">
          <SheetGrab />
          <div className="mt-3.5 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <BottomSheetTitle className="text-[19px] font-extrabold text-slate-800">챌린지 결과</BottomSheetTitle>
              <BottomSheetDescription className="mt-1 text-[13px] text-slate-500">나의 도전과 보상을 한눈에 확인해요.</BottomSheetDescription>
            </div>
            <BottomSheetClose aria-label="닫기" className="focus-ring grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100">
              <X className="size-[22px]" aria-hidden="true" />
            </BottomSheetClose>
          </div>
        </div>

        {/* 바디 */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-slate-500">결과를 불러오고 있어요...</p>
            </div>
          ) : error || !result ? (
            <div className="text-center py-12 text-sm text-red-500">
              {error || '결과를 불러올 수 없습니다.'}
            </div>
          ) : (
            <>
              {/* 축하 / 상태 배너 */}
              <Card tone="hero" className="text-center">
                <DayuExpression expression={shouldCelebrate ? 'done' : sentiment.badgeTone === 'amber' ? 'rest' : 'default'} alt="" className="mx-auto mb-3 size-14" />
                <Chip tone={sentiment.badgeTone === 'amber' ? 'warn' : sentiment.badgeTone === 'emerald' ? 'ok' : 'gray'}>
                  {sentiment.badgeText}
                </Chip>

                <h3 className="mt-3 text-lg font-extrabold text-slate-900 tracking-tight">
                  {sentiment.headline}
                </h3>
                <p className="text-[13px] text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  {sentiment.subline}
                </p>

                {result.status === 'PROVISIONAL' && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-md">
                    <Clock className="w-3.5 h-3.5" />
                    마지막 인증 인정 기한이 지나면 결과가 확정돼요.
                  </div>
                )}
              </Card>

              {/* 핵심 지표 요약 카드 */}
              <Card className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-100 pb-2.5">
                  <span className="text-[13px] font-medium text-slate-500">챌린지 기간</span>
                  <span className="text-[13px] font-semibold text-slate-800 tabular-nums">
                    {result.startDate} ~ {result.endDate}
                  </span>
                </div>

                {myParticipantResult && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-100 pb-2.5">
                      <span className="text-[13px] font-medium text-slate-500">내 참가 시작일</span>
                      <span className="text-[13px] font-semibold text-slate-800 tabular-nums">
                        {myParticipantResult.participantStartDate}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <span className="text-xs text-slate-500 block">목표 횟수</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {myParticipantResult.targetCount}회
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <span className="text-xs text-slate-500 block">완료 횟수</span>
                        <span className="text-sm font-bold text-emerald-700 tabular-nums">
                          {myParticipantResult.completedCount}회
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <span className="text-xs text-slate-500 block">달성률</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {myParticipantResult.achievementRate != null
                            ? `${Math.round(myParticipantResult.achievementRate)}%`
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {/* 지각 및 추가 정보 */}
                    {myParticipantResult.lateCount > 0 && (
                      <p className="text-xs text-slate-500 text-right mt-1">
                        지각 인증 {myParticipantResult.lateCount}건 (기록 보존, 보상 인정 제외)
                      </p>
                    )}

                    {/* 함께하기(공동 챌린지) 분리 표시 (F03) */}
                    {result.executionType === 'TOGETHER' && (
                      <div className="mt-3 bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-[13px] text-blue-900">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">공동 목표 달성률</span>
                          <span className="font-bold tabular-nums">
                            {result.achievementRate != null
                              ? `${Math.round(result.achievementRate)}%`
                              : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-blue-800">
                          <span>내 기여 횟수</span>
                          <span className="font-semibold tabular-nums">
                            {myParticipantResult.contributionCount}회
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 코인 보상 및 지급 상태 (F03, 5.4) */}
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center">
                          <Coins className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <span className="text-[13px] font-bold text-slate-900 block">
                            코인 보상 내역
                          </span>
                          <span className="text-xs text-slate-600">
                            {myParticipantResult.coinGrantStatus === 'PENDING'
                              ? '현재 코인 적립 중이에요'
                              : myParticipantResult.coinRewardCount > 0
                              ? `${myParticipantResult.coinRewardCount} 코인 적립 완료`
                              : '적립된 코인이 없어요'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-amber-700 tabular-nums">
                          +{myParticipantResult.coinRewardCount} C
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </Card>

              {/* 다음 행동 연결 3종 (F08, 5.6) */}
              <div className="space-y-2 pt-1">
                <span className="text-[13px] font-bold text-slate-700 px-1 block">다음 도전도 함께해요</span>

                <button
                  onClick={() => {
                    onClose();
                    navigate('/profile');
                  }}
                  className="focus-ring w-full min-h-12 flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-800">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>코인 내역 보기</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate(`/groups/${groupId}/challenges/new`);
                  }}
                  className="focus-ring w-full min-h-12 flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-800">
                    <PlusCircle className="w-4 h-4 text-blue-600" />
                    <span>다음 챌린지 만들기</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate(`/groups/${groupId}/settlements`);
                  }}
                  className="focus-ring w-full min-h-12 flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-800">
                    <Receipt className="w-4 h-4 text-slate-500" />
                    <span>정산 확인하러 가기</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" onClick={onClose} className="focus-ring w-full">닫기</Button>
        </div>
      </>
    </BottomSheet>
  );
};
