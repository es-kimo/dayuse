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

/** ViewB 신규 생성에서 기존 카드와 허용 추천 안내를 비교한다. 두 안 모두 기본 허용. */
export const CHALLENGE_REDAY_UI_EXPERIMENT = 'challenge-reday-ui-v1';

/**
 * 리데이 안내 문구·구성 실험 (v0.11 F13)
 *
 * 실험 변인은 **설명 문구와 안내 구성**뿐이다. 리데이 허용 여부·기한·벌금 금액·보상 티켓 수량은
 * Variant로 갈라지지 않는다. 돈과 벌칙이 걸린 값이 사용자별로 달라지면 같은 조건에서 금전적 결과가
 * 달라지고, 배정 조회가 실패했을 때 어떤 값으로 Fallback해도 누군가는 손해를 본다.
 *
 * 전환 이벤트는 `recovery_started`(리데이 사용/획득 경로 진입)다.
 */
export const REDAY_GUIDE_COPY_EXPERIMENT = 'reday-guide-copy-v1';

export interface RedayGuideCopy {
  /** 안내 제목 */
  headline: string;
  /** 본문 설명. 지각 기록이 남는다는 사실은 두 Variant 모두 반드시 포함한다. */
  body: string;
  /** 티켓이 없을 때 광고 경로를 권하는 보조 문장 */
  earnHint: string;
}

export const REDAY_GUIDE_COPY: Record<ExperimentVariant, RedayGuideCopy> = {
  /** Control: 기존 기본 안내. */
  A: {
    headline: '리데이 티켓으로 벌금을 면제할 수 있어요',
    body: '늦었지만 해냈네요. 리데이 티켓을 사용하면 이번 벌금이 면제돼요. 지각 기록은 그대로 남아요.',
    earnHint: '보유한 리데이 티켓이 없어요. 짧은 안내를 보고 1장을 받을 수 있어요.',
  },
  /** Treatment: 남은 기한과 '이어가기'를 앞세운 구성. 정책 값은 A와 완전히 동일하다. */
  B: {
    headline: '기한 안이라면 아직 이어갈 수 있어요',
    body: '늦었지만 해냈네요. 기한이 끝나기 전에 리데이 티켓을 사용하면 이번 벌금이 면제돼요. 지각 기록은 그대로 남아요.',
    earnHint: '티켓이 없어도 괜찮아요. 짧은 안내를 끝까지 보면 1장을 받아 바로 쓸 수 있어요.',
  },
};

/**
 * 배정 상태에서 안내 문구를 고른다.
 *
 * 실험에 실제로 참여한 상태가 아니면(미확정·미참여·비활성·조회 실패) 언제나 기본 문구(A)다.
 * 즉 Experiment 시스템이 죽어도 리데이 화면은 실험 이전과 똑같은 안내로 동작한다.
 */
export function resolveRedayGuideCopy(state: ExperimentState | undefined): RedayGuideCopy {
  if (!state || !shouldRecordExposure(state)) {
    return REDAY_GUIDE_COPY.A;
  }
  return REDAY_GUIDE_COPY[state.variant] ?? REDAY_GUIDE_COPY.A;
}
