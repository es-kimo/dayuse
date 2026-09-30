/**
 * Frontend Experiment 연동 타입 (F04, F05)
 * 백엔드 ExperimentVariant / ExperimentFallbackReason과 1:1로 맞춘다.
 */
export type ExperimentVariant = 'A' | 'B';

/** 비활성·미존재·미참여·오류 시 항상 이 Variant(Control/Default)로 돌아간다. */
export const DEFAULT_VARIANT: ExperimentVariant = 'A';

export type ExperimentFallbackReason =
  | 'NONE'
  | 'NOT_FOUND'
  | 'INACTIVE_DRAFT'
  | 'INACTIVE_STOPPED'
  | 'ROLLOUT_DISABLED'
  | 'ERROR';

export type ExperimentStatus = 'DRAFT' | 'ACTIVE' | 'STOPPED';

/** GET /experiments/{key}/assignment 응답 */
export interface ExperimentAssignmentResponse {
  experimentKey: string;
  status: ExperimentStatus | null;
  participating: boolean;
  variant: ExperimentVariant;
  isFallback: boolean;
  fallbackReason: ExperimentFallbackReason;
}

/**
 * 화면이 소비하는 Variant 확정 상태.
 *
 * variant는 어떤 경우에도 유효한 값이다. 미확정(isReady=false) 구간에도 DEFAULT_VARIANT가 들어 있으므로
 * 화면은 null 체크 없이 분기할 수 있고, 대신 isReady로 렌더 타이밍만 게이트한다.
 */
export interface ExperimentState {
  experimentKey: string;
  variant: ExperimentVariant;
  participating: boolean;
  /** Variant가 확정됐는지. false인 동안 실험 영역을 렌더하지 않아 A → B Flicker를 막는다. */
  isReady: boolean;
  isFallback: boolean;
  fallbackReason: ExperimentFallbackReason;
}
