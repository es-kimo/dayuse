import { useState, useEffect, useCallback } from 'react';
import type { AnnouncementPlacement, AnnouncementUserItemResponse } from '../types';
import { getPlacementNotice, markAnnouncementAsDismissed } from '../api/announcements';
import { useAnnouncementNotification } from '../context/AnnouncementNotificationContext';
import { useAuth } from '../context/AuthContext';

/**
 * 특정 화면에 머무르는 동안 닫거나 확인한 공지 ID를 기록하여
 * 같은 화면 방문 중에 다음 소식이 즉시 연달아 노출되는 것을 방지하는 세션 메모리 셋.
 */
const dismissedOrViewedIdsInCurrentSession = new Set<number>();

export function usePlacementNotice(placement: AnnouncementPlacement) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { refreshUnreadDot } = useAnnouncementNotification();
  const [notice, setNotice] = useState<AnnouncementUserItemResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setNotice(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    getPlacementNotice(placement)
      .then((res) => {
        if (!active) return;
        const candidate = res.announcement;
        if (candidate && !dismissedOrViewedIdsInCurrentSession.has(candidate.id)) {
          setNotice(candidate);
        } else {
          setNotice(null);
        }
      })
      .catch(() => {
        // Fail-Safe: 공지 조회 실패 시 조용히 생략하여 본래 서비스 기능 보호
        if (active) setNotice(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [placement, isAuthenticated, authLoading]);

  const dismiss = useCallback(async () => {
    if (!notice) return;
    const targetId = notice.id;

    // 즉시 현재 화면에서 안내 숨김 및 세션 방지 셋에 기록
    dismissedOrViewedIdsInCurrentSession.add(targetId);
    setNotice(null);

    try {
      await markAnnouncementAsDismissed(targetId);
      void refreshUnreadDot();
    } catch {
      // 닫기 API 실패 시에도 현재 화면에서는 즉시 안내를 닫아 사용자 작업을 방해하지 않음
    }
  }, [notice, refreshUnreadDot]);

  return {
    notice,
    loading,
    dismiss,
  };
}
