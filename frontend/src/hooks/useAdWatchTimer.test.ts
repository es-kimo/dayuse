import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdWatchTimer } from './useAdWatchTimer';

/**
 * 탭 가시성에 따른 시청 타이머 누적 검증 (v0.11 F11)
 *
 * 화면을 보지 않는 동안 시청 시간이 쌓이면 사용자가 광고를 보지 않고도 최소 시청 시간을
 * 채울 수 있고, 서버의 경과 시간 검증과도 어긋난다.
 */
describe('useAdWatchTimer', () => {
  let visibility: DocumentVisibilityState = 'visible';

  const setVisibility = (next: DocumentVisibilityState) => {
    visibility = next;
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(() => {
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('보이는 동안 흐른 시간만 누적해 최소 시청 시간을 채운다', () => {
    const { result } = renderHook(() => useAdWatchTimer(10));

    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.watchedSeconds).toBe(10);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.isSatisfied).toBe(true);
  });

  it('탭이 가려진 동안에는 시청 시간이 늘지 않는다', () => {
    const { result } = renderHook(() => useAdWatchTimer(10));

    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(result.current.watchedSeconds).toBe(4);

    act(() => setVisibility('hidden'));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.watchedSeconds).toBe(4);
    expect(result.current.isPaused).toBe(true);
    expect(result.current.isSatisfied).toBe(false);
  });

  it('돌아오면 멈춘 지점부터 이어서 센다', () => {
    const { result } = renderHook(() => useAdWatchTimer(10));

    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    act(() => setVisibility('hidden'));
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    act(() => setVisibility('visible'));
    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(result.current.watchedSeconds).toBe(10);
    expect(result.current.isSatisfied).toBe(true);
    expect(result.current.isPaused).toBe(false);
  });

  it('stop 이후에는 시간이 흐르지 않고 reset은 누적을 지운다', () => {
    const { result } = renderHook(() => useAdWatchTimer(10));

    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    act(() => result.current.stop());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.watchedSeconds).toBe(3);

    act(() => result.current.reset());
    expect(result.current.watchedSeconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('최소 시청 시간이 0이면 충족으로 보지 않는다', () => {
    const { result } = renderHook(() => useAdWatchTimer(0));
    act(() => result.current.start());
    expect(result.current.isSatisfied).toBe(false);
  });
});
