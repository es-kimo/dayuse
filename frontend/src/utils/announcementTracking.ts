import { track } from './tracker';

/**
 * 동일 화면 방문(세션/마운트) 내 동일 소식 ID + 노출 위치의 중복 impression 방지 세트.
 *
 * "API 응답을 받은 시점이 아니라 실제 화면에 표시된 시점에 announcement_impression을 기록하고,
 * 같은 화면 방문 안에서 동일 소식·위치의 중복 기록을 막아야 함." (F10)
 */
const recordedImpressions = new Set<string>();

export function getImpressionKey(announcementId: number, placement?: string | null): string {
  return `${announcementId}:${placement || 'unknown'}`;
}

export function hasRecordedImpression(announcementId: number, placement?: string | null): boolean {
  return recordedImpressions.has(getImpressionKey(announcementId, placement));
}

export function clearRecordedImpressions(): void {
  recordedImpressions.clear();
}

/**
 * 홈 카드 또는 인라인 안내가 실제 화면에 표시될 때 호출하여 1회만 노출 이벤트를 기록합니다.
 */
export function trackAnnouncementImpression(
  announcementId: number,
  placement?: string | null,
  featureKey?: string | null
): boolean {
  const key = getImpressionKey(announcementId, placement);
  if (recordedImpressions.has(key)) {
    return false;
  }
  recordedImpressions.add(key);

  track('announcement_impression', {
    announcementId,
    placement: placement ?? null,
    featureKey: featureKey ?? null,
  });

  return true;
}

/**
 * 사용자가 안내를 닫았을 때(Dismiss) 기록합니다.
 */
export function trackAnnouncementDismissed(
  announcementId: number,
  placement?: string | null,
  featureKey?: string | null
): void {
  track('announcement_dismissed', {
    announcementId,
    placement: placement ?? null,
    featureKey: featureKey ?? null,
  });
}

/**
 * 사용자가 소식 상세 화면을 정상적으로 열람했을 때(Opened) 기록합니다.
 */
export function trackAnnouncementOpened(
  announcementId: number,
  placement?: string | null,
  featureKey?: string | null
): void {
  track('announcement_opened', {
    announcementId,
    placement: placement ?? null,
    featureKey: featureKey ?? null,
  });
}
