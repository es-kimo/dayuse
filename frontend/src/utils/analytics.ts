/**
 * 랜딩 유입 측정 및 세션 분석 모듈 (F06)
 *
 * ⚠️ 개인정보 보호 및 무결성 원칙:
 * 1. 실명, 계좌번호, 사진, 초대 토큰 등 PII(개인식별정보)는 일절 수집/전송하지 않습니다.
 * 2. 네트워크 지연, AdBlock 차단, 서버 장애 발생 시에도 사용자 이동(로그인, 모임 생성 등)을
 *    절대 가로막지 않도록 완전히 비동기/예외 안전(silent non-blocking)하게 동작합니다.
 */

export interface UtmParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
}

export type LandingEventName =
  | 'landing_view'
  | 'hero_cta_click'
  | 'footer_cta_click'
  | 'my_group_click';

export interface LandingEventPayload {
  sessionId: string;
  eventName: LandingEventName;
  placement?: 'hero' | 'bottom';
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  referrer?: string;
  timestamp: string;
}

export const STORAGE_KEY_UTM = 'dayuse_utm_params';
export const STORAGE_KEY_SESSION = 'dayuse_session_id';
export const STORAGE_KEY_LANDING_VIEW_FIRED = 'dayuse_landing_view_fired';

export const DEFAULT_UTM: UtmParams = {
  utm_source: 'direct',
  utm_medium: 'unknown',
  utm_campaign: 'unknown',
  utm_content: 'unknown',
};

/**
 * URL 쿼리스트링에서 UTM 파라미터를 파싱하고 sessionStorage에 보존합니다.
 * - 신규 UTM 파라미터가 유입되면 우선 갱신
 * - 기존 세션에 이미 저장된 UTM이 있다면 덮어쓰지 않고 보존
 * - 정보가 전혀 없으면 direct/unknown 기본값으로 기록
 */
export function parseAndCacheUtm(searchString?: string): UtmParams {
  try {
    const search = searchString ?? (typeof window !== 'undefined' ? window.location.search : '');
    const params = new URLSearchParams(search);

    const hasUtmInQuery =
      params.has('utm_source') ||
      params.has('utm_medium') ||
      params.has('utm_campaign') ||
      params.has('utm_content');

    if (hasUtmInQuery) {
      const parsed: UtmParams = {
        utm_source: params.get('utm_source')?.trim() || 'direct',
        utm_medium: params.get('utm_medium')?.trim() || 'unknown',
        utm_campaign: params.get('utm_campaign')?.trim() || 'unknown',
        utm_content: params.get('utm_content')?.trim() || 'unknown',
      };
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(STORAGE_KEY_UTM, JSON.stringify(parsed));
      }
      return parsed;
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      const cached = window.sessionStorage.getItem(STORAGE_KEY_UTM);
      if (cached) {
        try {
          const parsedCached = JSON.parse(cached) as UtmParams;
          if (parsedCached.utm_source) return parsedCached;
        } catch {
          // ignore JSON parse error
        }
      }
      // 세션에 없으면 기본값 캐싱
      window.sessionStorage.setItem(STORAGE_KEY_UTM, JSON.stringify(DEFAULT_UTM));
    }
  } catch {
    // sessionStorage 접근 제한 환경 대비
  }

  return { ...DEFAULT_UTM };
}

/**
 * 세션 식별자를 가져오거나 신규 생성합니다.
 */
export function getOrCreateSessionId(): string {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const existing = window.sessionStorage.getItem(STORAGE_KEY_SESSION);
      if (existing) return existing;

      const newId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      window.sessionStorage.setItem(STORAGE_KEY_SESSION, newId);
      return newId;
    }
  } catch {
    // fallback
  }

  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 분석 이벤트를 백엔드에 안전하게 전송합니다 (Non-blocking).
 */
export async function sendLandingEvent(
  eventName: LandingEventName,
  options?: { placement?: 'hero' | 'bottom'; searchString?: string }
): Promise<boolean> {
  try {
    const sessionId = getOrCreateSessionId();
    const utm = parseAndCacheUtm(options?.searchString);
    const referrer = typeof document !== 'undefined' ? document.referrer || undefined : undefined;

    const payload: LandingEventPayload = {
      sessionId,
      eventName,
      placement: options?.placement,
      utmSource: utm.utm_source,
      utmMedium: utm.utm_medium,
      utmCampaign: utm.utm_campaign,
      utmContent: utm.utm_content,
      referrer,
      timestamp: new Date().toISOString(),
    };

    const endpoint = '/api/v1/public/analytics/events';
    const jsonBody = JSON.stringify(payload);

    // 1. sendBeacon 우선 시도 (페이지 이동 시에도 끊김 없이 전송)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([jsonBody], { type: 'application/json' });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) return true;
    }

    // 2. fetch 폴백 (타임아웃 3초 가드)
    if (typeof fetch === 'function') {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null;

      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: jsonBody,
          keepalive: true,
          signal: controller?.signal,
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
      return true;
    }
  } catch {
    // 무결성 원칙: 전송 실패는 사용자 경험에 전혀 영향을 주지 않고 무시
  }
  return false;
}

/**
 * 랜딩 진입 시 1회 방문 로깅 (세션 내 중복 방지)
 */
export function trackLandingView(searchString?: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (window.sessionStorage.getItem(STORAGE_KEY_LANDING_VIEW_FIRED)) {
        return;
      }
      window.sessionStorage.setItem(STORAGE_KEY_LANDING_VIEW_FIRED, '1');
    }
  } catch {
    // ignore
  }

  void sendLandingEvent('landing_view', { searchString });
}

/**
 * 첫 화면 시작 버튼 클릭 (`hero_cta_click`)
 */
export function trackHeroCtaClick(): void {
  void sendLandingEvent('hero_cta_click', { placement: 'hero' });
}

/**
 * 마지막 시작 버튼 클릭 (`footer_cta_click`)
 */
export function trackFooterCtaClick(): void {
  void sendLandingEvent('footer_cta_click', { placement: 'bottom' });
}

/**
 * '내 모임으로' 버튼 클릭 (`my_group_click`)
 */
export function trackMyGroupClick(): void {
  void sendLandingEvent('my_group_click');
}
