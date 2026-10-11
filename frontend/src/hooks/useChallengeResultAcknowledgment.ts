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

  // TODO [사용자 미션 2-1]: 축하 효과 조건 판정 (shouldCelebrate)
  // 조건: 확정(CONFIRMED) 상태이면서 목표를 완주(isSuccess || (targetCount > 0 && completedCount >= targetCount))했고,
  //       결과 수정 재확인 건이 아니며(!isRevised), OS 동작 줄이기(!prefersReduced)인 경우에만 true
  const shouldCelebrate = false;

  useEffect(() => {
    // TODO [사용자 미션 2-2]: 확정 결과 열람 시 계정별 확인 상태 기록 및 전이 트리거 (F02, 5.5)
    // 1. result 또는 myParticipantResult가 없으면 바로 리턴
    // 2. 잠정(PROVISIONAL) 결과이거나, 이미 확인 완료되었고 수정되지 않은 경우(!isRevised) API 호출 유보
    // 3. 중복 호출 방지(hasCalledRef.current) 처리 후 challengeResultApi.acknowledgeResult(groupId, challengeId) 호출
    // 4. API 응답 성공 시 onAcknowledged 콜백 호출
  }, [groupId, challengeId, result, myParticipantResult, isConfirmedOrAborted, isAlreadyAck, isRevised, onAcknowledged]);

  return {
    isAcknowledging,
    acknowledgmentError,
    isAcknowledged: isAlreadyAck || hasCalledRef.current,
    isRevised,
    shouldCelebrate,
  };
}
