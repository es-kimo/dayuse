import {
  DEFAULT_VARIANT,
  type ExperimentAssignmentResponse,
  type ExperimentFallbackReason,
  type ExperimentState,
  type ExperimentVariant,
} from '../types/experiment';

/**
 * Experiment 순수 판별 로직 및 세션 캐시 (F04, F05)
 *
 * 훅과 화면은 여기 있는 함수만 쓴다. React에 의존하지 않으므로 단위 테스트로 전부 검증할 수 있다.
 */

export const EXPERIMENT_CACHE_KEY = 'dayuse_experiment_assignments';
export const EXPERIMENT_EXPOSURE_KEY = 'dayuse_experiment_exposures';

const VALID_VARIANTS: readonly ExperimentVariant[] = ['A', 'B'];

export const isValidVariant = (value: unknown): value is ExperimentVariant =>
  typeof value === 'string' && (VALID_VARIANTS as readonly string[]).includes(value);

/** 조회 실패·미인증·미확정 상황에서 쓰는 기본 경험 상태. isReady는 호출부가 정한다. */
export function fallbackState(
  experimentKey: string,
  fallbackReason: ExperimentFallbackReason = 'ERROR',
  isReady = true
): ExperimentState {
  return {
    experimentKey,
    variant: DEFAULT_VARIANT,
    participating: false,
    isReady,
    isFallback: true,
    fallbackReason,
  };
}

/** Variant 확정 전 상태. 화면은 isReady=false를 보고 실험 영역 렌더를 보류한다. */
export const pendingState = (experimentKey: string): ExperimentState => ({
  ...fallbackState(experimentKey, 'NONE', false),
});

/**
 * 서버 응답을 화면이 쓰는 상태로 변환한다.
 *
 * 응답이 null이거나 Variant 값이 계약을 벗어나면(신규 Variant 추가, 프록시 오염 등)
 * 예외를 던지지 않고 기본 경험으로 내려앉는다.
 */
export function toExperimentState(
  experimentKey: string,
  response: ExperimentAssignmentResponse | null | undefined
): ExperimentState {
  if (!response || !isValidVariant(response.variant)) {
    return fallbackState(experimentKey, 'ERROR');
  }

  const isFallback = response.isFallback === true || response.participating !== true;
  return {
    experimentKey,
    variant: isFallback ? DEFAULT_VARIANT : response.variant,
    participating: response.participating === true,
    isReady: true,
    isFallback,
    fallbackReason: response.fallbackReason ?? (isFallback ? 'ERROR' : 'NONE'),
  };
}

/**
 * Exposure(`experiment_exposed`)를 기록해도 되는 상태인지 판별한다.
 *
 * 배정 ≠ 노출이므로, 실제로 실험 경험을 받은 참여자에게만 기록한다.
 * 미확정(isReady=false)·미참여(participating=false)·Fallback 상태는 전부 제외한다.
 */
export function shouldRecordExposure(state: ExperimentState): boolean {
  return (
    state.isReady &&
    state.participating &&
    !state.isFallback &&
    isValidVariant(state.variant) &&
    state.experimentKey.trim().length > 0
  );
}

export const exposureKey = (experimentKey: string, variant: ExperimentVariant): string =>
  `${experimentKey}:${variant}`;

// --- sessionStorage 헬퍼 (private 모드·차단 환경에서도 throw하지 않는다) ---

function readMap(storageKey: string): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeMap(storageKey: string, value: Record<string, unknown>): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // 저장 실패는 캐시 미스로만 취급한다.
  }
}

/**
 * 같은 세션 안에서 페이지를 다시 방문했을 때 재요청 없이 즉시 Variant를 확정한다.
 * (첫 렌더부터 isReady=true가 되어 Flicker가 생기지 않는다)
 */
export function readCachedState(experimentKey: string): ExperimentState | null {
  const cached = readMap(EXPERIMENT_CACHE_KEY)[experimentKey];
  if (!cached || typeof cached !== 'object') return null;
  const state = cached as ExperimentState;
  if (!isValidVariant(state.variant) || typeof state.participating !== 'boolean') return null;
  return { ...state, experimentKey, isReady: true };
}

export function writeCachedState(state: ExperimentState): void {
  if (!state.isReady) return;
  // 오류 Fallback은 캐시하지 않는다. 일시 장애를 세션 끝까지 물고 가면 실험이 죽는다.
  if (state.fallbackReason === 'ERROR') return;
  const map = readMap(EXPERIMENT_CACHE_KEY);
  map[state.experimentKey] = state;
  writeMap(EXPERIMENT_CACHE_KEY, map);
}

/** 로그인·로그아웃 시 호출한다. 이전 사용자의 배정이 다음 사용자에게 새지 않게 한다. */
export function clearExperimentCache(): void {
  try {
    sessionStorage.removeItem(EXPERIMENT_CACHE_KEY);
    sessionStorage.removeItem(EXPERIMENT_EXPOSURE_KEY);
  } catch {
    // noop
  }
}

/** 세션 단위 Exposure 중복 제어. 같은 실험·Variant는 세션에 한 번만 기록한다. */
export function hasRecordedExposure(experimentKey: string, variant: ExperimentVariant): boolean {
  return readMap(EXPERIMENT_EXPOSURE_KEY)[exposureKey(experimentKey, variant)] === true;
}

export function markExposureRecorded(experimentKey: string, variant: ExperimentVariant): void {
  const map = readMap(EXPERIMENT_EXPOSURE_KEY);
  map[exposureKey(experimentKey, variant)] = true;
  writeMap(EXPERIMENT_EXPOSURE_KEY, map);
}
