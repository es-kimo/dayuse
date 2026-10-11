import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Trophy,
  Coins,
  Clock,
  Sparkles,
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

  if (!isOpen) return null;

  const sentiment = getResultSentiment({
    status: result?.status ?? 'PROVISIONAL',
    isSuccess: myParticipantResult?.isSuccess ?? false,
    completedCount: myParticipantResult?.completedCount ?? 0,
    targetCount: myParticipantResult?.targetCount ?? 0,
    abortReason: result?.abortReason,
    isRevised,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">챌린지 최종 결과</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500">도전 결과를 정산하고 있어요...</p>
            </div>
          ) : error || !result ? (
            <div className="text-center py-12 text-sm text-red-500">
              {error || '결과를 불러올 수 없습니다.'}
            </div>
          ) : (
            <>
              {/* 축하 / 상태 배너 */}
              <div
                className={`relative overflow-hidden p-5 rounded-2xl border text-center ${
                  sentiment.badgeTone === 'emerald'
                    ? 'bg-gradient-to-b from-emerald-50 to-teal-50/60 border-emerald-200'
                    : sentiment.badgeTone === 'amber'
                    ? 'bg-gradient-to-b from-amber-50 to-orange-50/50 border-amber-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {/* 축하 효과 */}
                {shouldCelebrate && (
                  <div className="flex justify-center mb-2 text-emerald-600">
                    <Sparkles className="w-7 h-7 animate-bounce" />
                  </div>
                )}

                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold mb-2 bg-white shadow-2xs border border-gray-100">
                  <span
                    className={
                      sentiment.badgeTone === 'emerald'
                        ? 'text-emerald-700'
                        : sentiment.badgeTone === 'amber'
                        ? 'text-amber-700'
                        : 'text-gray-700'
                    }
                  >
                    {sentiment.badgeText}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  {sentiment.headline}
                </h3>
                <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  {sentiment.subline}
                </p>

                {result.status === 'PROVISIONAL' && (
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-md">
                    <Clock className="w-3.5 h-3.5" />
                    마지막 인증 인정 기한이 지나면 결과가 확정돼요.
                  </div>
                )}
              </div>

              {/* 핵심 지표 요약 카드 */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <span className="text-xs font-medium text-gray-500">챌린지 운영 기간</span>
                  <span className="text-xs font-semibold text-gray-800 tabular-nums">
                    {result.startDate} ~ {result.endDate}
                  </span>
                </div>

                {myParticipantResult && (
                  <>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <span className="text-xs font-medium text-gray-500">내 참가 시작일</span>
                      <span className="text-xs font-semibold text-gray-800 tabular-nums">
                        {myParticipantResult.participantStartDate}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <span className="text-[11px] text-gray-500 block">목표 횟수</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">
                          {myParticipantResult.targetCount}회
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <span className="text-[11px] text-gray-500 block">인정 수행</span>
                        <span className="text-sm font-bold text-emerald-700 tabular-nums">
                          {myParticipantResult.completedCount}회
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <span className="text-[11px] text-gray-500 block">달성률</span>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">
                          {myParticipantResult.achievementRate != null
                            ? `${Math.round(myParticipantResult.achievementRate)}%`
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {/* 지각 및 추가 정보 */}
                    {myParticipantResult.lateCount > 0 && (
                      <p className="text-[11px] text-gray-500 text-right mt-1">
                        지각 인증 {myParticipantResult.lateCount}건 (기록 보존, 보상 인정 제외)
                      </p>
                    )}

                    {/* 함께하기(공동 챌린지) 분리 표시 (F03) */}
                    {result.executionType === 'TOGETHER' && (
                      <div className="mt-3 bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs text-blue-900">
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
                          <span className="text-xs font-bold text-gray-900 block">
                            코인 보상 내역
                          </span>
                          <span className="text-[11px] text-gray-600">
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
              </div>

              {/* 다음 행동 연결 3종 (F08, 5.6) */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-gray-700 px-1 block">다음 행동 연결</span>

                <button
                  onClick={() => {
                    onClose();
                    navigate('/profile');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-800">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>코인 내역 보기</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate(`/groups/${groupId}/challenges/new`);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-800">
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span>다음 챌린지 만들기</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate(`/groups/${groupId}/settlements`);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-800">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span>정산 확인하러 가기</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* 하단 닫기/확인 버튼 */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            확인 완료
          </button>
        </div>
      </div>
    </div>
  );
};
