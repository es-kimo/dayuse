import { useState, useEffect } from 'react';

export interface GracePeriodStatus {
  isGracePeriod: boolean;
  remainingMs: number;
  formattedTime: string;
  isExpired: boolean;
}

/**
 * targetDate(YYYY-MM-DD)의 익일 오전 09:00 KST 마감까지의 잔여 시간을 1초 단위로 계산하는 훅
 */
export function getGraceDeadline(targetDate: string): Date {
  const [year, month, day] = targetDate.split('-').map(Number);
  // targetDate 익일 날짜 구하기 (Date.UTC로 안전하게 일 단위 연산)
  const nextDayUtc = new Date(Date.UTC(year, month - 1, day + 1));
  const nextYear = nextDayUtc.getUTCFullYear();
  const nextMonth = String(nextDayUtc.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(nextDayUtc.getUTCDate()).padStart(2, '0');
  // 브라우저 로컬 타임존과 무관하게 한국 표준시(+09:00) 오전 9시로 정확하게 파싱
  return new Date(`${nextYear}-${nextMonth}-${nextDay}T09:00:00+09:00`);
}

export function calculateGracePeriod(targetDate: string): GracePeriodStatus {
  const deadline = getGraceDeadline(targetDate);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      isGracePeriod: false,
      remainingMs: 0,
      formattedTime: '00:00:00',
      isExpired: true,
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted =
    hours > 0
      ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    isGracePeriod: true,
    remainingMs: diff,
    formattedTime: formatted,
    isExpired: false,
  };
}

export function useGracePeriodTimer(targetDate: string): GracePeriodStatus {
  const [status, setStatus] = useState<GracePeriodStatus>(() => calculateGracePeriod(targetDate));

  useEffect(() => {
    setStatus(calculateGracePeriod(targetDate));

    const interval = setInterval(() => {
      const current = calculateGracePeriod(targetDate);
      setStatus(current);
      if (current.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return status;
}
