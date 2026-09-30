import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { clearPendingExperimentRequests, useExperiment } from './useExperiment';
import { fetchExperimentAssignment } from '../api/experiments';
import { clearExperimentCache, writeCachedState } from '../utils/experiment';
import type { ExperimentAssignmentResponse } from '../types/experiment';

vi.mock('../api/experiments', () => ({ fetchExperimentAssignment: vi.fn() }));

const fetchMock = vi.mocked(fetchExperimentAssignment);

/** 조회 Promise 해소와 그로 인한 상태 반영을 flush한다. */
const flushAssignment = async () => {
  await act(async () => {
    // .finally → .then 체인과 in-flight 정리까지 모두 흐르도록 매크로태스크 한 틱을 넘긴다.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};
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

describe('useExperiment', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPendingExperimentRequests();
    clearExperimentCache();
  });

  it('조회 전에는 isReady=false이고 variant는 기본값(A)이다', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useExperiment(KEY));
    expect(result.current.isReady).toBe(false);
    expect(result.current.variant).toBe('A');
    expect(result.current.participating).toBe(false);
  });

  it('조회가 끝나면 Variant를 확정한다', async () => {
    fetchMock.mockResolvedValue(response());
    const { result } = renderHook(() => useExperiment(KEY));
    await flushAssignment();
    expect(result.current.isReady).toBe(true);
    expect(result.current.variant).toBe('B');
    expect(result.current.participating).toBe(true);
  });

  it('조회 실패 시 throw 없이 즉시 기본 경험으로 확정한다', async () => {
    fetchMock.mockResolvedValue(null);
    const { result } = renderHook(() => useExperiment(KEY));
    await flushAssignment();
    expect(result.current.isReady).toBe(true);
    expect(result.current.variant).toBe('A');
    expect(result.current.isFallback).toBe(true);
    expect(result.current.fallbackReason).toBe('ERROR');
  });

  it('예상치 못한 rejection도 기본 경험으로 흡수한다', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExperiment(KEY));
    await flushAssignment();
    expect(result.current.isReady).toBe(true);
    expect(result.current.variant).toBe('A');
    expect(result.current.isFallback).toBe(true);
  });

  it('세션 캐시가 있으면 첫 렌더부터 isReady=true이고 재요청하지 않는다 (Flicker 방지)', () => {
    writeCachedState({
      experimentKey: KEY,
      variant: 'B',
      participating: true,
      isReady: true,
      isFallback: false,
      fallbackReason: 'NONE',
    });

    const { result } = renderHook(() => useExperiment(KEY));
    expect(result.current.isReady).toBe(true);
    expect(result.current.variant).toBe('B');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enabled=false인 동안에는 조회하지 않고 미확정 상태를 유지한다', async () => {
    fetchMock.mockResolvedValue(response());
    const { result, rerender } = renderHook(({ enabled }) => useExperiment(KEY, enabled), {
      initialProps: { enabled: false },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isReady).toBe(false);

    rerender({ enabled: true });
    await flushAssignment();
    expect(result.current.isReady).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('같은 키를 여러 컴포넌트가 동시에 마운트해도 요청은 1회로 합쳐진다', async () => {
    fetchMock.mockResolvedValue(response());
    const first = renderHook(() => useExperiment(KEY));
    const second = renderHook(() => useExperiment(KEY));

    await flushAssignment();
    expect(first.result.current.variant).toBe('B');
    expect(second.result.current.variant).toBe('B');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
