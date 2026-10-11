import type { ChallengeResultStatus } from '../types';

export interface ResultSentimentInfo {
  headline: string;
  subline: string;
  badgeText: string;
  badgeTone: 'emerald' | 'amber' | 'slate';
  showCelebration: boolean;
}

/**
 * OS prefers-reduced-motion 설정 감지
 */
export function checkPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 챌린지 결과에 대한 감정 UX 문구 및 상태 판정 (PRD 5.5, 6)
 * - 목표 달성: "끝까지 해냈어요"
 * - 일부 달성: "이번 도전에서 N번 실천했어요"
 * - 0회 실천: 실패 낙인 대신 실천 횟수 존중 문구 안내
 * - 중단: 사유 표시 및 축하 배제
 * - 결과 수정/재확인 시: 축하 효과 중복 재생 방지
 * - prefers-reduced-motion 존중: 애니메이션 억제
 */
export function getResultSentiment(params: {
  status: ChallengeResultStatus;
  isSuccess: boolean;
  completedCount: number;
  targetCount: number;
  abortReason?: string | null;
  isRevised?: boolean;
  prefersReducedMotion?: boolean;
}): ResultSentimentInfo {
  const {
    status,
    isSuccess,
    completedCount,
    targetCount,
    abortReason,
    isRevised = false,
    prefersReducedMotion = false,
  } = params;

  if (status === 'ABORTED') {
    return {
      headline: '챌린지가 중단되었어요',
      subline: abortReason ? `중단 사유: ${abortReason}` : '운영 사유로 인해 챌린지가 조기 중단되었어요.',
      badgeText: isRevised ? '결과가 수정됐어요' : '중단됨',
      badgeTone: 'slate',
      showCelebration: false,
    };
  }

  // 목표 달성 (C >= T)
  if (isSuccess || (targetCount > 0 && completedCount >= targetCount)) {
    return {
      headline: '끝까지 해냈어요! 🎉',
      subline: `목표 ${targetCount}회를 모두 완주하셨어요. 멋진 성과예요!`,
      badgeText: isRevised ? '결과가 수정됐어요' : '목표 달성',
      badgeTone: 'emerald',
      showCelebration: !isRevised && !prefersReducedMotion,
    };
  }

  // 일부 달성 (C > 0)
  if (completedCount > 0) {
    return {
      headline: `이번 도전에서 ${completedCount}번 실천했어요! 💪`,
      subline: `목표 ${targetCount}회 중 ${completedCount}번을 실천하며 성장했어요.`,
      badgeText: isRevised ? '결과가 수정됐어요' : `${completedCount}회 실천`,
      badgeTone: 'amber',
      showCelebration: false,
    };
  }

  // 0회 실천 (실패 낙인 배제)
  return {
    headline: '이번 도전에서 0번 실천했어요 🌱',
    subline: '다음 도전에서는 작은 목표부터 가볍게 시작해볼까요?',
    badgeText: isRevised ? '결과가 수정됐어요' : '도전 완료',
    badgeTone: 'slate',
    showCelebration: false,
  };
}
