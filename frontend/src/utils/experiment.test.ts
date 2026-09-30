import { beforeEach, describe, expect, it } from 'vitest';
import type { ExperimentAssignmentResponse, ExperimentState } from '../types/experiment';
import {
  clearExperimentCache,
  fallbackState,
  hasRecordedExposure,
  markExposureRecorded,
  pendingState,
  readCachedState,
  shouldRecordExposure,
  toExperimentState,
  writeCachedState,
} from './experiment';

const KEY = 'challenge-invite-copy-v1';

const response = (
  overrides: Partial<ExperimentAssignmentResponse> = {}
): ExperimentAssignmentResponse => ({
  experimentKey: KEY,
  status: 'ACTIVE',
  participating: true,
  variant: 'B',
  isFallback: false,
  fallbackReason: 'NONE',
  ...overrides,
});

const participatingState = (overrides: Partial<ExperimentState> = {}): ExperimentState => ({
  experimentKey: KEY,
  variant: 'B',
  participating: true,
  isReady: true,
  isFallback: false,
  fallbackReason: 'NONE',
  ...overrides,
});

describe('toExperimentState', () => {
  it('참여 중인 활성 실험은 서버 Variant를 그대로 확정한다', () => {
    expect(toExperimentState(KEY, response())).toEqual(participatingState());
  });

  it('응답이 null이면 예외 없이 기본 경험(A)으로 내려앉는다', () => {
    const state = toExperimentState(KEY, null);
    expect(state).toEqual(fallbackState(KEY, 'ERROR'));
    expect(state.variant).toBe('A');
    expect(state.isReady).toBe(true);
  });

  it('participating=false면 서버가 B를 줬더라도 기본 경험(A)으로 강제한다', () => {
    const state = toExperimentState(
      KEY,
      response({ participating: false, variant: 'B', isFallback: true, fallbackReason: 'ROLLOUT_DISABLED' })
    );
    expect(state.variant).toBe('A');
    expect(state.participating).toBe(false);
    expect(state.fallbackReason).toBe('ROLLOUT_DISABLED');
  });

  it('계약을 벗어난 Variant 값은 기본 경험으로 처리한다', () => {
    const state = toExperimentState(KEY, response({ variant: 'C' as never }));
    expect(state.variant).toBe('A');
    expect(state.isFallback).toBe(true);
  });
});

describe('shouldRecordExposure', () => {
  it('확정된 참여자에게만 true다', () => {
    expect(shouldRecordExposure(participatingState())).toBe(true);
    expect(shouldRecordExposure(participatingState({ variant: 'A' }))).toBe(true);
  });

  it('Variant 미확정 구간에는 기록하지 않는다', () => {
    expect(shouldRecordExposure(pendingState(KEY))).toBe(false);
  });

  it('미참여자·Fallback 상태에는 기록하지 않는다', () => {
    expect(shouldRecordExposure(participatingState({ participating: false }))).toBe(false);
    expect(shouldRecordExposure(fallbackState(KEY, 'INACTIVE_DRAFT'))).toBe(false);
    expect(shouldRecordExposure(fallbackState(KEY, 'ERROR'))).toBe(false);
  });

  it('experimentKey가 비어 있으면 기록하지 않는다', () => {
    expect(shouldRecordExposure(participatingState({ experimentKey: '  ' }))).toBe(false);
  });
});

describe('세션 캐시', () => {
  beforeEach(() => {
    clearExperimentCache();
  });

  it('확정된 배정은 캐시에서 isReady=true로 즉시 복원된다 (Flicker 방지)', () => {
    writeCachedState(participatingState());
    expect(readCachedState(KEY)).toEqual(participatingState());
  });

  it('오류 Fallback은 캐시하지 않아 다음 방문에 다시 조회한다', () => {
    writeCachedState(fallbackState(KEY, 'ERROR'));
    expect(readCachedState(KEY)).toBeNull();
  });

  it('미확정 상태는 캐시하지 않는다', () => {
    writeCachedState(pendingState(KEY));
    expect(readCachedState(KEY)).toBeNull();
  });

  it('비활성 실험 Fallback은 캐시해 재요청을 줄인다', () => {
    writeCachedState(fallbackState(KEY, 'INACTIVE_STOPPED'));
    expect(readCachedState(KEY)?.fallbackReason).toBe('INACTIVE_STOPPED');
  });

  it('저장된 값이 깨져 있으면 null로 취급한다', () => {
    sessionStorage.setItem('dayuse_experiment_assignments', 'not-json');
    expect(readCachedState(KEY)).toBeNull();
  });
});

describe('Exposure 중복 제어', () => {
  beforeEach(() => {
    clearExperimentCache();
  });

  it('같은 실험·Variant는 세션에 한 번만 기록된 것으로 본다', () => {
    expect(hasRecordedExposure(KEY, 'B')).toBe(false);
    markExposureRecorded(KEY, 'B');
    expect(hasRecordedExposure(KEY, 'B')).toBe(true);
  });

  it('Variant가 다르면 별개로 집계한다', () => {
    markExposureRecorded(KEY, 'B');
    expect(hasRecordedExposure(KEY, 'A')).toBe(false);
  });

  it('로그인·로그아웃 시 기록이 초기화된다', () => {
    markExposureRecorded(KEY, 'B');
    clearExperimentCache();
    expect(hasRecordedExposure(KEY, 'B')).toBe(false);
  });
});
