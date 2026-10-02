import { apiClient } from './client';

export interface FeatureEventRequest {
  featureKey: string;
  variant: string;
  eventType: string;
  metadata?: Record<string, any>;
}

export const featuresApi = {
  /**
   * 노출(Impression) 및 액션 비동기 로깅 전송
   * 로깅 실패 시에도 UI나 메인 비즈니스를 차단하지 않도록 안전하게 격리 처리
   */
  sendFeatureEvent: async (event: FeatureEventRequest): Promise<void> => {
    try {
      await apiClient.post('/features/events', event);
    } catch (err) {
      // 분석 로깅 실패는 콘솔 경고만 남기고 메인 흐름에 영향을 주지 않는다.
      console.warn('[FeatureLogging] 비동기 이벤트 전송 실패 (무시됨):', event.eventType, err);
    }
  },
};
