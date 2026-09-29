import { useEffect, useRef } from 'react';
import { featuresApi } from '../api/features';

/**
 * 프론트엔드 컴포넌트 실제 마운트 노출(Impression) 로깅 훅
 * 세션 및 화면 단위로 중복 전송을 방지하며 컴포넌트가 성공적으로 렌더링된 시점에만 비동기 전송합니다.
 */
export function useFeatureImpression(
  featureKey: string,
  variant: string,
  screenName: string,
  enabled: boolean = true
) {
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasLoggedRef.current) return;

    const sessionKey = `dayuse_imp_${featureKey}_${screenName}`;
    const alreadyLoggedSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey);

    if (!alreadyLoggedSession) {
      hasLoggedRef.current = true;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(sessionKey, 'true');
      }
      void featuresApi.sendFeatureEvent({
        featureKey,
        variant,
        eventType: 'IMPRESSION',
        metadata: { screen: screenName },
      });
    }
  }, [featureKey, variant, screenName, enabled]);
}

/**
 * 인증 플로우 액션 로깅 유틸리티
 */
export async function logCertFlowAction(
  variant: string,
  eventType: 'CERT_FLOW_ENTER' | 'CERT_FLOW_SUCCESS' | 'CERT_FLOW_FAIL',
  metadata?: Record<string, any>
): Promise<void> {
  await featuresApi.sendFeatureEvent({
    featureKey: 'ui_refresh_01',
    variant,
    eventType,
    metadata,
  });
}
