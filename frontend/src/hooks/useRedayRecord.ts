import { useCallback, useEffect, useRef, useState } from 'react';
import { recordsApi } from '../api/records';
import { redayApi } from '../api/reday';
import type { RedayEligibilityResponse } from '../types';
import { resolveRedayAction, type RedayActionState } from '../utils/reday';

/**
 * 한 지각 기록의 리데이 상태 동기화 훅 (v0.11 F11)
 *
 * 화면을 나갔다 돌아와도 같은 결과를 보여주려면 보유 티켓 잔액과 기록의 리데이 처리 결과를
 * 화면 로컬 상태로 들고 있어서는 안 된다. 열릴 때마다 서버에서 다시 확정하고,
 * 티켓 사용·광고 보상 뒤에도 서버 값으로 되맞춘다.
 *
 * 남은 기한은 서버가 준 `remainingSeconds`에서 1초씩 내려간다.
 * 클라이언트가 기한 시각을 직접 계산하면 기기 시계가 틀어진 만큼 그대로 틀어진다.
 */

export interface RedayRecordState {
  eligibility: RedayEligibilityResponse | null;
  availableTicketCount: number;
  action: RedayActionState;
  remainingSeconds: number;
  loading: boolean;
  /** 조회 자체가 실패한 경우(통신 실패 등) */
  loadFailed: boolean;
  refresh: () => Promise<void>;
}

export function useRedayRecord(dailyRecordId: number | null, enabled: boolean): RedayRecordState {
  const [eligibility, setEligibility] = useState<RedayEligibilityResponse | null>(null);
  const [availableTicketCount, setAvailableTicketCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // 언마운트 후 도착한 응답으로 setState하지 않는다.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!dailyRecordId) return;
    setLoading(true);
    try {
      // 적격 판정과 티켓 잔액은 서로 독립이므로 한 번에 받는다.
      const [nextEligibility, balance] = await Promise.all([
        recordsApi.getRedayEligibility(dailyRecordId),
        redayApi.getTicketBalance(),
      ]);
      if (!mountedRef.current) return;
      setEligibility(nextEligibility);
      setAvailableTicketCount(balance.availableCount);
      setRemainingSeconds(Math.max(0, nextEligibility.remainingSeconds));
      setLoadFailed(false);
    } catch {
      if (!mountedRef.current) return;
      setLoadFailed(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [dailyRecordId]);

  useEffect(() => {
    if (!enabled || !dailyRecordId) return;
    void refresh();
  }, [enabled, dailyRecordId, refresh]);

  // 기한 카운트다운. 0에 닿으면 같은 값으로 머물러 React가 재렌더를 생략한다.
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  /*
   * 카운트다운이 0에 닿았으면 서버가 아직 '적격'이라고 응답했더라도 사용 버튼을 내린다.
   * 이 상태로 사용 요청을 보내도 서버가 기한 만료로 거절하므로, 미리 기한 만료로 보여주는 편이
   * 눌렀다가 실패하는 경험보다 낫다.
   */
  const effectiveEligibility: RedayEligibilityResponse | null =
    eligibility && eligibility.eligible && remainingSeconds <= 0
      ? { ...eligibility, eligible: false, reason: 'EXPIRED' }
      : eligibility;

  return {
    eligibility: effectiveEligibility,
    availableTicketCount,
    action: resolveRedayAction(effectiveEligibility, availableTicketCount),
    remainingSeconds,
    loading,
    loadFailed,
    refresh,
  };
}
