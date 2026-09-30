import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExperimentExposure } from './useExperimentExposure';
import { track } from '../utils/tracker';
import { clearExperimentCache } from '../utils/experiment';
import type { ExperimentState } from '../types/experiment';

vi.mock('../utils/tracker', () => ({ track: vi.fn() }));

const trackMock = vi.mocked(track);
const KEY = 'challenge-invite-copy-v1';

const state = (overrides: Partial<ExperimentState> = {}): ExperimentState => ({
  experimentKey: KEY,
  variant: 'B',
  participating: true,
  isReady: true,
  isFallback: false,
  fallbackReason: 'NONE',
  ...overrides,
});

describe('useExperimentExposure', () => {
  beforeEach(() => {
    trackMock.mockClear();
    clearExperimentCache();
  });

  it('확정된 참여자에게 experimentKey·variant와 함께 1회 발화한다', () => {
    renderHook(() => useExperimentExposure(state()));
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('experiment_exposed', {
      experimentKey: KEY,
      variant: 'B',
    });
  });

  it('리렌더링이 반복돼도 다시 발화하지 않는다', () => {
    const { rerender } = renderHook(() => useExperimentExposure(state()));
    rerender();
    rerender();
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('재마운트(페이지 재방문)에도 같은 세션에서는 다시 발화하지 않는다', () => {
    renderHook(() => useExperimentExposure(state())).unmount();
    renderHook(() => useExperimentExposure(state()));
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('Variant 미확정 구간에는 발화하지 않고, 확정되는 순간 1회 발화한다', () => {
    const { rerender } = renderHook(({ isReady }) => useExperimentExposure(state({ isReady })), {
      initialProps: { isReady: false },
    });
    expect(trackMock).not.toHaveBeenCalled();

    rerender({ isReady: true });
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('미참여자에게는 발화하지 않는다', () => {
    renderHook(() => useExperimentExposure(state({ participating: false, variant: 'A' })));
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('조회 실패 Fallback 상태에서는 발화하지 않는다', () => {
    renderHook(() =>
      useExperimentExposure(
        state({ participating: false, variant: 'A', isFallback: true, fallbackReason: 'ERROR' })
      )
    );
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('visible=false인 동안 대기하고, 실제로 보이는 순간 발화한다', () => {
    const { rerender } = renderHook(
      ({ visible }) => useExperimentExposure(state(), visible),
      { initialProps: { visible: false } }
    );
    expect(trackMock).not.toHaveBeenCalled();

    rerender({ visible: true });
    expect(trackMock).toHaveBeenCalledTimes(1);
  });
});
