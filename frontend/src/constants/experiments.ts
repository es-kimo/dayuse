import type { ExperimentState, ExperimentVariant } from '../types/experiment';
import { shouldRecordExposure } from '../utils/experiment';

/**
 * 첫 Dayuse A/B Test: 챌린지 참여 화면 초대 안내 문구 (v0.10 F09)
 *
 * 단일 변인 통제: A와 B는 **문구만** 다르다. 컨테이너·색상·아이콘·레이아웃·기능은 동일하다.
 * 문구와 함께 버튼 색이나 배치까지 바꾸면 CVR 차이가 어느 변인 때문인지 분리할 수 없다.
 *
 * 전환 이벤트는 `challenge_joined`이며, 실험 종료 후 정리 절차는
 * backend `DayuseExperimentDefinitions`의 KDoc에 정리되어 있다.
 */
export const CHALLENGE_INVITE_COPY_EXPERIMENT = 'challenge-invite-copy-v1';

export const CHALLENGE_INVITE_COPY: Record<ExperimentVariant, string> = {
  /** Control: 실험 이전부터 쓰던 기본 문구. */
  A: '친구와 14일 동안 목표를 이어가보세요.',
  /** Treatment: 초대받은 상황과 즉시 시작을 강조한 문구. */
  B: '14일 챌린지에 초대받았어요. 지금 함께 시작해보세요.',
};

/**
 * Variant 확정 상태로부터 화면에 띄울 문구를 고른다.
 *
 * 실험에 실제로 참여한 상태가 아니면(미확정·미참여·비활성 실험·조회 실패) 언제나 기본 문구(A)다.
 * 즉 Experiment 시스템이 죽어도 이 화면은 실험 이전과 똑같은 문구로 동작한다.
 */
export function resolveChallengeInviteCopy(state: ExperimentState): string {
  if (!shouldRecordExposure(state)) {
    return CHALLENGE_INVITE_COPY.A;
  }
  return CHALLENGE_INVITE_COPY[state.variant] ?? CHALLENGE_INVITE_COPY.A;
}
