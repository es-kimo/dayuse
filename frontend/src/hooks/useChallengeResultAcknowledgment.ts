import { useState, useEffect, useRef } from 'react';
import { challengeResultApi } from '../api/challengeResult';
import { checkPrefersReducedMotion } from '../utils/challengeResultSentiment';
import type { ChallengeResultDetail, ChallengeParticipantResult } from '../types';

export interface UseChallengeResultAcknowledgmentOptions {
  groupId: number;
  challengeId: number;
  result: ChallengeResultDetail | null;
  myParticipantResult: ChallengeParticipantResult | null;
  onAcknowledged?: (updatedParticipant: ChallengeParticipantResult) => void;
}

export interface UseChallengeResultAcknowledgmentReturn {
  isAcknowledging: boolean;
  acknowledgmentError: string | null;
  isAcknowledged: boolean;
  isRevised: boolean;
  shouldCelebrate: boolean;
}

/**
 * 챌린지 결과 상세 열람 시 확인 상태(acknowledged) 전이 및 축하 효과 제어 훅 (F02, 5.5, 6)
 */
export function useChallengeResultAcknowledgment({
  groupId,
  challengeId,
  result,
  myParticipantResult,
  onAcknowledged,
}: UseChallengeResultAcknowledgmentOptions): UseChallengeResultAcknowledgmentReturn {
  const [isAcknowledging, setIsAcknowledging] = useState<boolean>(false);
  const [acknowledgmentError, setAcknowledgmentError] = useState<string | null>(null);
  const hasCalledRef = useRef<boolean>(false);

  const status = result?.status;
  const isConfirmedOrAborted = status === 'CONFIRMED' || status === 'ABORTED';
  const isAlreadyAck = myParticipantResult?.isAcknowledged ?? false;
  const isRevised = myParticipantResult?.isRevised ?? false;
  const isSuccess = myParticipantResult?.isSuccess ?? false;
  const completedCount = myParticipantResult?.completedCount ?? 0;
  const targetCount = myParticipantResult?.targetCount ?? 0;

  // 축하 효과 조건: 성공 완주 && 결과 수정 건이 아님 && 동작 줄이기 비활성화 && 확정 상태
  const prefersReduced = checkPrefersReducedMotion();
  const isGoalAchieved = isSuccess || (targetCount > 0 && completedCount >= targetCount);
  const shouldCelebrate = status === 'CONFIRMED' && isGoalAchieved && !isRevised && !prefersReduced;

  useEffect(() => {
    // 잠정(PROVISIONAL) 결과이거나 이미 확인 완료되었고 수정되지 않은 경우 API 호출 유보
    if (!result || !myParticipantResult) return;
    if (!isConfirmedOrAborted) return;
    if (isAlreadyAck && !isRevised) return;
    if (hasCalledRef.current) return;

    hasCalledRef.current = true;
    let isMounted = true;

    async function recordAcknowledgment() {
      try {
        setIsAcknowledging(true);
        setAcknowledgmentError(null);
        const updated = await challengeResultApi.acknowledgeResult(groupId, challengeId);
        if (isMounted) {
          onAcknowledged?.(updated);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : '확인 상태 기록에 실패했습니다.';
          setAcknowledgmentError(msg);
        }
      } finally {
        if (isMounted) {
          setIsAcknowledging(false);
        }
      }
    }

    recordAcknowledgment();

    return () => {
      isMounted = false;
    };
  }, [groupId, challengeId, result, myParticipantResult, isConfirmedOrAborted, isAlreadyAck, isRevised, onAcknowledged]);

  return {
    isAcknowledging,
    acknowledgmentError,
    isAcknowledged: isAlreadyAck || hasCalledRef.current,
    isRevised,
    shouldCelebrate,
  };
}
