import { useState, useEffect, useCallback } from 'react';
import { challengeResultApi } from '../api/challengeResult';
import type { EndedChallengesSummaryResponse, EndedChallengeSummaryItem } from '../types';

export interface UseEndedChallengesSummaryReturn {
  summary: EndedChallengesSummaryResponse | null;
  unacknowledgedCount: number;
  items: EndedChallengeSummaryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  acknowledgeLocal: (challengeId: number) => void;
}

/**
 * 종료된 챌린지 요약 정보 및 홈 미확인 건수 상태 관리 훅 (F02, F04)
 */
export function useEndedChallengesSummary(): UseEndedChallengesSummaryReturn {
  const [summary, setSummary] = useState<EndedChallengesSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await challengeResultApi.getEndedChallengesSummary();
      setSummary(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '종료 결과 요약을 불러오지 못했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const acknowledgeLocal = useCallback((challengeId: number) => {
    setSummary((prev) => {
      if (!prev) return prev;
      const target = prev.items.find((it) => it.challengeId === challengeId);
      const wasUnack = target && (!target.isAcknowledged || target.isRevised);

      const updatedItems = prev.items.map((it) => {
        if (it.challengeId === challengeId) {
          return {
            ...it,
            isAcknowledged: true,
            isRevised: false,
            acknowledgedAt: new Date().toISOString(),
          };
        }
        return it;
      });

      return {
        unacknowledgedCount: wasUnack ? Math.max(0, prev.unacknowledgedCount - 1) : prev.unacknowledgedCount,
        items: updatedItems,
      };
    });
  }, []);

  return {
    summary,
    unacknowledgedCount: summary?.unacknowledgedCount ?? 0,
    items: summary?.items ?? [],
    loading,
    error,
    refresh: fetchSummary,
    acknowledgeLocal,
  };
}
