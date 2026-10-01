import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 자체 광고 시청 타이머 (v0.11 F11)
 *
 * 탭·앱이 보이지 않는 동안에는 시청 시간을 세지 않는다. 배경에서 타이머만 흐르게 두면
 * 사용자가 화면을 보지 않았는데도 최소 시청 시간이 채워지고, 서버의 경과 시간 검증과도 어긋난다.
 *
 * 경과 시간은 `Date.now()` 누적으로 계산한다. setInterval 틱을 세면 브라우저가 배경 탭에서
 * 타이머를 1초보다 느리게 돌릴 때 실제 경과와 벌어진다.
 */

export interface AdWatchTimerState {
  /** 실제로 화면이 보인 상태에서 누적된 시청 초 */
  watchedSeconds: number;
  /** 남은 초 (0 미만으로 내려가지 않음) */
  remainingSeconds: number;
  /** 최소 시청 시간 충족 여부 */
  isSatisfied: boolean;
  /** 탭·앱 비가시 또는 수동 정지로 멈춘 상태 */
  isPaused: boolean;
  /** 타이머가 돌아가는 중 */
  isRunning: boolean;
}

export interface AdWatchTimerControls extends AdWatchTimerState {
  start: () => void;
  stop: () => void;
  reset: () => void;
}

const isDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
};

export function useAdWatchTimer(requiredSeconds: number, tickMs = 250): AdWatchTimerControls {
  const [watchedMs, setWatchedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isVisible, setIsVisible] = useState<boolean>(() => isDocumentVisible());

  // 누적 경과는 ref로 들고 간다. setState 비동기 묶음에 더해지는 간격이 섞이면 시청 시간이 어긋난다.
  const accumulatedRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);

  const flushSegment = useCallback(() => {
    if (segmentStartRef.current === null) return;
    accumulatedRef.current += Date.now() - segmentStartRef.current;
    segmentStartRef.current = null;
    setWatchedMs(accumulatedRef.current);
  }, []);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    flushSegment();
    setIsRunning(false);
  }, [flushSegment]);

  const reset = useCallback(() => {
    segmentStartRef.current = null;
    accumulatedRef.current = 0;
    setWatchedMs(0);
    setIsRunning(false);
  }, []);

  // 탭 가시성 변화를 구독한다. 비가시 전환 순간까지의 시청 시간은 즉시 확정한다.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      const visible = isDocumentVisible();
      if (!visible) flushSegment();
      setIsVisible(visible);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushSegment]);

  const counting = isRunning && isVisible;

  useEffect(() => {
    if (!counting) {
      flushSegment();
      return;
    }

    segmentStartRef.current = Date.now();
    const interval = setInterval(() => {
      if (segmentStartRef.current === null) return;
      setWatchedMs(accumulatedRef.current + (Date.now() - segmentStartRef.current));
    }, tickMs);

    return () => {
      clearInterval(interval);
      flushSegment();
    };
  }, [counting, tickMs, flushSegment]);

  const watchedSeconds = Math.floor(watchedMs / 1000);
  const remainingSeconds = Math.max(0, requiredSeconds - watchedSeconds);

  return {
    watchedSeconds,
    remainingSeconds,
    isSatisfied: requiredSeconds > 0 && watchedSeconds >= requiredSeconds,
    isPaused: isRunning && !isVisible,
    isRunning: counting,
    start,
    stop,
    reset,
  };
}
