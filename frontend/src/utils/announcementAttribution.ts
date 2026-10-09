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
  // TODO [사용자 미션 2-1]: 무관한 화면 이동 시 소식 출처(Attribution) 즉시 해제
  // 1. 현재 저장된 출처 컨텍스트 `getAnnouncementAttribution()`을 조회합니다.
  // 2. destinationPath가 설정되어 있을 때, 새 경로(`newPathname`)가 목적지와 일치하지 않고
  //    모임 맥락(/groups) 내 이동도 아니라면 `clearAnnouncementAttribution()`을 호출하여 해제합니다.
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
  // TODO [사용자 미션 2-2]: 소식 출처 결합 및 1회 소비 후 즉시 해제
  // 1. `getAnnouncementAttribution()`을 확인하여 보존된 출처가 없으면 그대로 `properties`를 반환합니다.
  // 2. 출처가 있다면 `clearAnnouncementAttribution()`을 호출하여 즉시 해제합니다.
  // 3. properties에 `sourceAnnouncementId`, `sourcePlacement`, `sourceFeatureKey`를 결합하여 반환합니다.
  return { ...properties };
}
