import { useEffect, useState } from 'react';
import { calculateRemainingSeconds } from '../utils/reday';

/**
 * 리데이 기한까지 남은 초를 1초 단위로 세는 훅 (v0.11 F11)
 *
 * 계산은 [calculateRemainingSeconds]가 담당한다(KST 보정 포함). 이 훅은 갱신 주기만 책임진다.
 */
export function useRedayDeadlineTimer(deadline: string | null | undefined): number {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    calculateRemainingSeconds(deadline)
  );

  useEffect(() => {
    setRemainingSeconds(calculateRemainingSeconds(deadline));
    if (!deadline) return;

    const interval = setInterval(() => {
      setRemainingSeconds(calculateRemainingSeconds(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return remainingSeconds;
}
