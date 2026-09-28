import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  parseAndCacheUtm,
  getOrCreateSessionId,
  sendLandingEvent,
  trackLandingView,
  trackHeroCtaClick,
  trackFooterCtaClick,
  trackMyGroupClick,
  STORAGE_KEY_UTM,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_LANDING_VIEW_FIRED,
  DEFAULT_UTM,
} from './analytics';

describe('Landing Analytics Module (F06, BR-05)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('1. UTM 파라미터 파싱 및 세션 보존', () => {
    it('URL 쿼리에 UTM 파라미터가 포함되어 있으면 올바르게 파싱하고 sessionStorage에 저장한다', () => {
      const search = '?utm_source=instagram&utm_medium=cpc&utm_campaign=spring_challenge&utm_content=card_news_1';
      const utm = parseAndCacheUtm(search);

      expect(utm).toEqual({
        utm_source: 'instagram',
        utm_medium: 'cpc',
        utm_campaign: 'spring_challenge',
        utm_content: 'card_news_1',
      });

      const cached = sessionStorage.getItem(STORAGE_KEY_UTM);
      expect(cached).not.toBeNull();
      expect(JSON.parse(cached!)).toEqual(utm);
    });

    it('일부 UTM 파라미터만 있는 경우 누락된 값은 unknown으로 안전하게 채운다', () => {
      const search = '?utm_source=kakaotalk';
      const utm = parseAndCacheUtm(search);

      expect(utm).toEqual({
        utm_source: 'kakaotalk',
        utm_medium: 'unknown',
        utm_campaign: 'unknown',
        utm_content: 'unknown',
      });
    });

    it('쿼리 파라미터가 전혀 없는 직접 진입 시 direct/unknown 기본값을 반환하고 저장한다', () => {
      const utm = parseAndCacheUtm('');
      expect(utm).toEqual(DEFAULT_UTM);

      const cached = sessionStorage.getItem(STORAGE_KEY_UTM);
      expect(JSON.parse(cached!)).toEqual(DEFAULT_UTM);
    });

    it('기존 세션에 이미 저장된 UTM이 있다면 이후 쿼리 파라미터 없는 탐색에서도 기존 캠페인 값을 유지한다', () => {
      // 1. 인스타그램 유입으로 세션에 저장됨
      parseAndCacheUtm('?utm_source=instagram&utm_medium=story');

      // 2. 다른 페이지를 탐색하거나 쿼리 없는 랜딩 재진입
      const utm = parseAndCacheUtm('');
      expect(utm.utm_source).toBe('instagram');
      expect(utm.utm_medium).toBe('story');
    });
  });

  describe('2. 세션 식별자 관리', () => {
    it('세션 ID가 없으면 새로 생성하여 sessionStorage에 저장하고 반환한다', () => {
      const sessionId = getOrCreateSessionId();
      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
      expect(sessionStorage.getItem(STORAGE_KEY_SESSION)).toBe(sessionId);
    });

    it('이미 세션 ID가 발급되어 있으면 기존 세션 ID를 일관되게 재사용한다', () => {
      sessionStorage.setItem(STORAGE_KEY_SESSION, 'test-session-123');
      const sessionId = getOrCreateSessionId();
      expect(sessionId).toBe('test-session-123');
    });
  });

  describe('3. 이벤트 발송 및 PII 보호, 무결성 가드', () => {
    it('sendLandingEvent 호출 시 PII(개인정보) 없이 세션 및 UTM 정보만 전송한다', async () => {
      let sentBody = '';
      vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        sentBody = init?.body as string;
        return Promise.resolve({ ok: true });
      }));

      // navigator.sendBeacon을 지원하지 않는 환경으로 모킹
      vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

      parseAndCacheUtm('?utm_source=facebook&utm_medium=feed');
      const success = await sendLandingEvent('hero_cta_click', { placement: 'hero' });

      expect(success).toBe(true);
      expect(sentBody).toBeTruthy();

      const payload = JSON.parse(sentBody);
      expect(payload.eventName).toBe('hero_cta_click');
      expect(payload.placement).toBe('hero');
      expect(payload.utmSource).toBe('facebook');
      expect(payload.utmMedium).toBe('feed');
      expect(payload.sessionId).toBeTruthy();
      expect(payload.timestamp).toBeTruthy();

      // PII 엄격 검증
      expect(payload).not.toHaveProperty('nickname');
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('userId');
      expect(payload).not.toHaveProperty('account');
      expect(payload).not.toHaveProperty('token');
      expect(payload).not.toHaveProperty('photo');
    });

    it('네트워크 오류나 서버 에러가 발생해도 예외를 던지지 않고 false를 반환하여 사용자 동작을 차단하지 않는다', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error / AdBlock blocked')));
      vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

      let thrown = false;
      try {
        const result = await sendLandingEvent('footer_cta_click', { placement: 'bottom' });
        expect(result).toBe(false);
      } catch {
        thrown = true;
      }

      expect(thrown).toBe(false);
    });

    it('trackLandingView는 한 세션에서 최초 1회만 발송되고 이후 중복 발송되지 않는다', () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchSpy);
      vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

      trackLandingView();
      expect(sessionStorage.getItem(STORAGE_KEY_LANDING_VIEW_FIRED)).toBe('1');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // 동일 세션 내 2차 호출 시
      trackLandingView();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // 여전히 1회
    });

    it('trackHeroCtaClick, trackFooterCtaClick, trackMyGroupClick 헬퍼가 각각 적절한 이벤트로 트리거된다', () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchSpy);
      vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

      trackHeroCtaClick();
      trackFooterCtaClick();
      trackMyGroupClick();

      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
  });
});
