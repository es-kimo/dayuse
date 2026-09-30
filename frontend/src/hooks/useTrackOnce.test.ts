import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrackOnce } from './useTrackOnce';
import { track } from '../utils/tracker';

vi.mock('../utils/tracker', () => ({ track: vi.fn() }));

const trackMock = vi.mocked(track);

describe('useTrackOnce', () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  it('마운트 시 1회 발화한다', () => {
    renderHook(() => useTrackOnce('home_viewed'));
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('home_viewed', undefined);
  });

  it('리렌더링이 반복돼도 다시 발화하지 않는다', () => {
    const { rerender } = renderHook(() => useTrackOnce('home_viewed'));
    rerender();
    rerender();
    rerender();
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('properties 객체를 매 렌더 새로 만들어 넘겨도 재발화하지 않는다', () => {
    const { rerender } = renderHook(() =>
      useTrackOnce('certification_started', { challengeId: 7, groupId: 3 })
    );
    rerender();
    rerender();
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('certification_started', { challengeId: 7, groupId: 3 });
  });

  it('enabled가 false인 동안에는 대기하고, true가 되는 순간 한 번만 발화한다', () => {
    const { rerender } = renderHook(({ enabled }) => useTrackOnce('home_viewed', undefined, enabled), {
      initialProps: { enabled: false },
    });
    expect(trackMock).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(trackMock).toHaveBeenCalledTimes(1);

    // 로그아웃/재로그인처럼 enabled가 토글돼도 같은 마운트에서는 다시 세지 않는다.
    rerender({ enabled: false });
    rerender({ enabled: true });
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('새로 마운트되면 새 조회로 한 번 더 발화한다', () => {
    const first = renderHook(() => useTrackOnce('home_viewed'));
    act(() => first.unmount());
    renderHook(() => useTrackOnce('home_viewed'));
    expect(trackMock).toHaveBeenCalledTimes(2);
  });
});
