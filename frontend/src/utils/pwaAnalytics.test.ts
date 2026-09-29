import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  logPwaImpression,
  logPwaGuideOpen,
  dismissPwaBanner,
  isPwaBannerDismissed,
  initPwaInstallTracking,
  STORAGE_KEY_LAST_ENTRY,
  STORAGE_KEY_FIRST_LAUNCH,
  STORAGE_KEY_BANNER_DISMISSED_UNTIL,
} from './pwaAnalytics';
import { featuresApi } from '../api/features';

describe('pwaAnalytics', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.spyOn(featuresApi, 'sendFeatureEvent').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('동일 세션 내 같은 entryPoint의 IMPRESSION은 1회만 전송된다', () => {
    logPwaImpression('profile_menu');
    logPwaImpression('profile_menu');

    expect(featuresApi.sendFeatureEvent).toHaveBeenCalledTimes(1);
    expect(featuresApi.sendFeatureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        featureKey: 'pwa_install',
        eventType: 'IMPRESSION',
        metadata: expect.objectContaining({ entryPoint: 'profile_menu' }),
      })
    );
  });

  it('서로 다른 entryPoint는 각각 IMPRESSION이 전송된다', () => {
    logPwaImpression('today_banner');
    logPwaImpression('verification_success');

    expect(featuresApi.sendFeatureEvent).toHaveBeenCalledTimes(2);
  });

  it('GUIDE_OPEN 호출 시 최근 진입점을 localStorage에 저장하고 이벤트를 전송한다', () => {
    logPwaGuideOpen('today_banner');

    expect(localStorage.getItem(STORAGE_KEY_LAST_ENTRY)).toBe('today_banner');
    expect(featuresApi.sendFeatureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        featureKey: 'pwa_install',
        eventType: 'GUIDE_OPEN',
        metadata: expect.objectContaining({ entryPoint: 'today_banner' }),
      })
    );
  });

  it('배너 닫기 시 지정된 기간 동안 isPwaBannerDismissed가 true를 반환한다', () => {
    expect(isPwaBannerDismissed()).toBe(false);

    dismissPwaBanner(7);
    expect(isPwaBannerDismissed()).toBe(true);

    // 유효 기간 만료 케이스
    localStorage.setItem(STORAGE_KEY_BANNER_DISMISSED_UNTIL, (Date.now() - 1000).toString());
    expect(isPwaBannerDismissed()).toBe(false);
  });

  it('appinstalled 이벤트 수신 시 마지막 진입점 정보를 포함하여 INSTALLED 이벤트를 전송한다', () => {
    localStorage.setItem(STORAGE_KEY_LAST_ENTRY, 'verification_success');
    const cleanup = initPwaInstallTracking();

    window.dispatchEvent(new Event('appinstalled'));

    expect(featuresApi.sendFeatureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        featureKey: 'pwa_install',
        eventType: 'INSTALLED',
        metadata: expect.objectContaining({
          entryPoint: 'verification_success',
          os: 'android',
        }),
      })
    );

    cleanup();
  });

  it('isStandalone이 true인 첫 실행 시 FIRST_LAUNCH 이벤트를 1회 전송한다', () => {
    localStorage.setItem(STORAGE_KEY_LAST_ENTRY, 'profile_menu');
    (window.navigator as unknown as { standalone?: boolean }).standalone = true;

    const cleanup = initPwaInstallTracking();

    expect(featuresApi.sendFeatureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        featureKey: 'pwa_install',
        eventType: 'FIRST_LAUNCH',
        metadata: expect.objectContaining({
          entryPoint: 'profile_menu',
        }),
      })
    );
    expect(localStorage.getItem(STORAGE_KEY_FIRST_LAUNCH)).toBe('true');

    // 두 번째 실행 시에는 중복 전송되지 않음
    vi.clearAllMocks();
    initPwaInstallTracking();
    expect(featuresApi.sendFeatureEvent).not.toHaveBeenCalled();

    delete (window.navigator as unknown as { standalone?: boolean }).standalone;
    cleanup();
  });
});
