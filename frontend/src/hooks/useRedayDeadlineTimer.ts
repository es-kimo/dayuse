import { useEffect, useState } from 'react';
import { parseKstDate } from '../utils/date';

/**
 * 리데이 기한까지 남은 초를 1초 단위로 세는 훅 (v0.11 F11)
 *
 * 서버의 `redayDeadline`은 오프셋 없는 LocalDateTime 문자열이라
 * `new Date()`로 바로 파싱하면 브라우저 시간대만큼 틀어진다. 항상 [parseKstDate]로 KST 보정한다.
 */
export function calculateRedayRemainingSeconds(
  deadline: string | null | undefined,
  now: Date = new Date()
): number {
  const parsed = parseKstDate(deadline);
  if (!parsed) return 0;
  return Math.max(0, Math.floor((parsed.getTime() - now.getTime()) / 1000));
}

export function useRedayDeadlineTimer(deadline: string | null | undefined): number {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    calculateRedayRemainingSeconds(deadline)
  );

  useEffect(() => {
    setRemainingSeconds(calculateRedayRemainingSeconds(deadline));
    if (!deadline) return;

    const interval = setInterval(() => {
      setRemainingSeconds(calculateRedayRemainingSeconds(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return remainingSeconds;
}
