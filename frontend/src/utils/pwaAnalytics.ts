import { featuresApi } from '../api/features';
import { isStandalone, isIos, isAndroid } from './webPush';

export type PwaEntryPoint = 'profile_menu' | 'today_banner' | 'verification_success';

export const STORAGE_KEY_LAST_ENTRY = 'dayuse_pwa_last_entry';
export const STORAGE_KEY_FIRST_LAUNCH = 'dayuse_pwa_first_launch_logged';
export const STORAGE_KEY_BANNER_DISMISSED_UNTIL = 'dayuse_pwa_banner_dismissed_until';

/**
 * PWA 설치 안내 진입점 노출(Impression) 로깅
 * 동일 세션 내에서 같은 진입점의 중복 전송을 방지합니다.
 */
export function logPwaImpression(entryPoint: PwaEntryPoint): void {
  if (typeof window === 'undefined') return;

  const sessionKey = `dayuse_pwa_imp_${entryPoint}`;
  if (sessionStorage.getItem(sessionKey)) return;

  sessionStorage.setItem(sessionKey, 'true');
  void featuresApi.sendFeatureEvent({
    featureKey: 'pwa_install',
    variant: 'prod',
    eventType: 'IMPRESSION',
    metadata: {
      entryPoint,
      isStandalone: isStandalone(),
    },
  });
}

/**
 * PWA 설치 가이드 모달 오픈(Guide Open) 로깅 및 최근 진입점 기록
 * 이후 실제 설치/실행 전환이 발생했을 때 어느 진입점에서 유입되었는지 attribution합니다.
 */
export function logPwaGuideOpen(entryPoint: PwaEntryPoint): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_LAST_ENTRY, entryPoint);
  } catch (e) {
    console.error('Failed to save pwa last entry point:', e);
  }

  void featuresApi.sendFeatureEvent({
    featureKey: 'pwa_install',
    variant: 'prod',
    eventType: 'GUIDE_OPEN',
    metadata: {
      entryPoint,
      isStandalone: isStandalone(),
      os: isIos() ? 'ios' : isAndroid() ? 'android' : 'other',
    },
  });
}

/**
 * 오늘 화면 배너를 닫았을 때 n일 동안 다시 보지 않도록 설정
 */
export function dismissPwaBanner(days: number = 7): void {
  if (typeof window === 'undefined') return;
  const hideUntil = Date.now() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem(STORAGE_KEY_BANNER_DISMISSED_UNTIL, hideUntil.toString());
}

/**
 * 오늘 화면 배너가 숨김 처리 기간인지 확인
 */
export function isPwaBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEY_BANNER_DISMISSED_UNTIL);
  if (!raw) return false;
  const hideUntil = parseInt(raw, 10);
  if (isNaN(hideUntil)) return false;
  return Date.now() < hideUntil;
}

/**
 * PWA 설치 완료 및 첫 실행 전환 추적 리스너 등록
 */
export function initPwaInstallTracking(): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. Android / Chrome: 브라우저 기본 appinstalled 이벤트 감지
  const handleAppInstalled = () => {
    const entryPoint = localStorage.getItem(STORAGE_KEY_LAST_ENTRY) || 'direct';
    void featuresApi.sendFeatureEvent({
      featureKey: 'pwa_install',
      variant: 'prod',
      eventType: 'INSTALLED',
      metadata: {
        entryPoint,
        os: 'android',
      },
    });
  };

  window.addEventListener('appinstalled', handleAppInstalled);

  // 2. 홈 화면 앱으로 최초 실행 시(First Launch) 감지 (iOS 및 공통 전환율 확정)
  if (isStandalone()) {
    const alreadyLogged = localStorage.getItem(STORAGE_KEY_FIRST_LAUNCH);
    if (!alreadyLogged) {
      localStorage.setItem(STORAGE_KEY_FIRST_LAUNCH, 'true');
      const entryPoint = localStorage.getItem(STORAGE_KEY_LAST_ENTRY) || 'direct';
      void featuresApi.sendFeatureEvent({
        featureKey: 'pwa_install',
        variant: 'prod',
        eventType: 'FIRST_LAUNCH',
        metadata: {
          entryPoint,
          os: isIos() ? 'ios' : isAndroid() ? 'android' : 'other',
        },
      });
    }
  }

  return () => {
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
}
