import { describe, it, expect, afterEach } from 'vitest';
import { isAndroid, isIos, urlBase64ToUint8Array } from './webPush';

describe('webPush 유틸리티 함수', () => {
  const originalUserAgent = navigator.userAgent;

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

  it('안드로이드 UserAgent를 정확히 감지한다', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36');
    expect(isAndroid()).toBe(true);
    expect(isIos()).toBe(false);
  });

  it('iOS UserAgent를 정확히 감지한다', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1');
    expect(isIos()).toBe(true);
    expect(isAndroid()).toBe(false);
  });

  it('urlBase64ToUint8Array가 base64url 문자열을 uint8array로 정상 변환한다', () => {
    // Standard test base64url
    const base64Url = 'AQIDBA'; // [1, 2, 3, 4]
    const uint8 = urlBase64ToUint8Array(base64Url);
    expect(Array.from(uint8)).toEqual([1, 2, 3, 4]);
  });
});
