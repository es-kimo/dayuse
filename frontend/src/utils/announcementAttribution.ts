import type { AnnouncementAttributionContext, EventProperties } from '../types/analytics';

/**
 * 소식 CTA 클릭 및 현재 작업 귀속(Attribution) 생명주기 관리 유틸리티 (F10)
 *
 * 규칙:
 * 1. 실행 버튼(CTA) 클릭 시 소식 출처(sourceAnnouncementId, placement, featureKey)를 현재 작업 컨텍스트로 보존한다.
 * 2. 연결된 기능의 실제 성공 이벤트(예: certification_completed, recovery_completed 등)에 소식 출처를 함께 기록한다.
 * 3. 작업 성공·취소·무관한 화면 이동·로그아웃 시 출처를 즉시 해제하여 이후 모든 활동이 공지 성과로 과대 귀속되지 않도록 방어한다.
 */

export const STORAGE_KEY_ANNOUNCEMENT_ATTRIBUTION = 'dayuse_announcement_attribution';

export interface ExtendedAnnouncementAttributionContext extends AnnouncementAttributionContext {
  destinationPath?: string | null;
}

export function setAnnouncementAttribution(
  attribution: ExtendedAnnouncementAttributionContext
): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(
        STORAGE_KEY_ANNOUNCEMENT_ATTRIBUTION,
        JSON.stringify({
          ...attribution,
          attachedAt: attribution.attachedAt || new Date().toISOString(),
        })
      );
    }
  } catch {
    // sessionStorage 접근 제한 환경 대비 Fail-Safe
  }
}

export function getAnnouncementAttribution(): ExtendedAnnouncementAttributionContext | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(STORAGE_KEY_ANNOUNCEMENT_ATTRIBUTION);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as ExtendedAnnouncementAttributionContext;
      if (parsed && typeof parsed.sourceAnnouncementId === 'number') {
        return parsed;
      }
    }
  } catch {
    // JSON parse error or storage error
  }
  return null;
}

/**
 * 라우트 이동 시 호출되어, 사용자가 CTA 목적지 외의 무관한 화면으로 이동했는지 확인하고
 * 무관한 화면으로 이탈한 경우 소식 출처를 즉시 해제합니다.
 */
export function checkRouteNavigation(newPathname: string): void {
  const current = getAnnouncementAttribution();
  if (!current) return;

  // 목적지 경로가 설정되어 있는 경우
  if (current.destinationPath) {
    // 목적지 경로와 같거나 목적지 하위 경로(예: /groups/123)인 경우 출처 유지
    const isMatchingDestination =
      newPathname === current.destinationPath ||
      (current.destinationPath !== '/' &&
        current.destinationPath !== '/groups' &&
        newPathname.startsWith(current.destinationPath));

    // /groups 로 시작하는 경우 /groups/:id 등의 이동도 맥락 유지 허용
    const isGroupContext =
      current.destinationPath.startsWith('/groups') && newPathname.startsWith('/groups');

    if (!isMatchingDestination && !isGroupContext) {
      clearAnnouncementAttribution();
    }
  }
}

export function clearAnnouncementAttribution(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(STORAGE_KEY_ANNOUNCEMENT_ATTRIBUTION);
    }
  } catch {
    // Fail-Safe
  }
}

/**
 * 이벤트 properties에 현재 보존된 소식 출처 컨텍스트가 있다면 결합하고,
 * 소비와 동시에(consume=true) 출처를 즉시 해제합니다.
 */
export function consumeAnnouncementAttribution(
  properties: EventProperties = {}
): EventProperties {
  const attribution = getAnnouncementAttribution();
  if (!attribution) {
    return { ...properties };
  }

  // 성공 이벤트 등에 1회 소비 후 즉시 해제하여 이후 작업에 과대 귀속 방지
  clearAnnouncementAttribution();

  const enriched: EventProperties = {
    ...properties,
    sourceAnnouncementId: attribution.sourceAnnouncementId,
  };

  if (attribution.placement) {
    enriched.sourcePlacement = attribution.placement;
  }
  if (attribution.featureKey) {
    enriched.sourceFeatureKey = attribution.featureKey;
  }

  return enriched;
}
