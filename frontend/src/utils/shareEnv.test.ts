import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isIOS,
  isAndroid,
  isMobile,
  isKakaoInApp,
  isInAppBrowser,
  getInAppBrowserName,
  openInExternalBrowser,
} from './shareEnv';

describe('shareEnv 환경 판정 및 인앱 브라우저 유틸', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
  });

  const setUserAgent = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      writable: true,
      configurable: true,
    });
  };

  it('카카오톡 인앱 브라우저를 올바르게 감지한다', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 KAKAOTALK 10.0.0');
    expect(isKakaoInApp()).toBe(true);
    expect(isInAppBrowser()).toBe(true);
    expect(getInAppBrowserName()).toBe('kakaotalk');
  });

  it('인스타그램 인앱 브라우저를 올바르게 감지한다', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 Instagram 280.0.0');
    expect(isKakaoInApp()).toBe(false);
    expect(isInAppBrowser()).toBe(true);
    expect(getInAppBrowserName()).toBe('instagram');
    expect(isAndroid()).toBe(true);
    expect(isMobile()).toBe(true);
  });

  it('일반 모바일 Safari 브라우저는 인앱 브라우저로 감지하지 않는다', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1');
    expect(isKakaoInApp()).toBe(false);
    expect(isInAppBrowser()).toBe(false);
    expect(getInAppBrowserName()).toBeNull();
    expect(isIOS()).toBe(true);
  });

  it('카카오톡 인앱 브라우저에서 외부 브라우저 호출 시 kakaotalk:// 스킴으로 이동한다', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) KAKAOTALK 10.0.0');
    const locationMock = { href: 'https://dayuse.kr/about' };
    vi.stubGlobal('location', locationMock);

    const result = openInExternalBrowser('https://dayuse.kr/about');
    expect(result).toBe(true);
    expect(locationMock.href).toBe('kakaotalk://web/openExternal?url=https%3A%2F%2Fdayuse.kr%2Fabout');
  });

  it('안드로이드 환경에서 외부 브라우저 호출 시 intent 스킴으로 이동한다', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-G998N) Instagram 280.0.0');
    const locationMock = { href: 'https://dayuse.kr/login' };
    vi.stubGlobal('location', locationMock);

    const result = openInExternalBrowser('https://dayuse.kr/login');
    expect(result).toBe(true);
    expect(locationMock.href).toContain('intent://dayuse.kr/login#Intent');
    expect(locationMock.href).toContain('package=com.android.chrome');
  });
});
