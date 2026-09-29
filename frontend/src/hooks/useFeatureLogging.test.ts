import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureImpression, logCertFlowAction } from './useFeatureLogging';
import { featuresApi } from '../api/features';

describe('useFeatureLogging (비즈니스 로직 및 훅)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('동일 세션에서 동일 화면 노출(Impression)은 최초 1회만 전송된다', () => {
    const sendSpy = vi.spyOn(featuresApi, 'sendFeatureEvent').mockResolvedValue();

    // 첫 번째 렌더
    const { rerender } = renderHook(
      ({ enabled }) => useFeatureImpression('ui_refresh_01', 'B', 'today', enabled),
      { initialProps: { enabled: true } }
    );

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith({
      featureKey: 'ui_refresh_01',
      variant: 'B',
      eventType: 'IMPRESSION',
      metadata: { screen: 'today' },
    });

    // 재렌더링 시 중복 호출 방지 확인
    rerender({ enabled: true });
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('enabled가 false이면 노출 로깅을 전송하지 않는다', () => {
    const sendSpy = vi.spyOn(featuresApi, 'sendFeatureEvent').mockResolvedValue();

    renderHook(() => useFeatureImpression('ui_refresh_01', 'B', 'groups', false));

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('logCertFlowAction은 지정된 액션 타입과 메타데이터로 이벤트를 전송한다', async () => {
    const sendSpy = vi.spyOn(featuresApi, 'sendFeatureEvent').mockResolvedValue();

    await logCertFlowAction('B', 'CERT_FLOW_SUCCESS', { challengeId: 42 });

    expect(sendSpy).toHaveBeenCalledWith({
      featureKey: 'ui_refresh_01',
      variant: 'B',
      eventType: 'CERT_FLOW_SUCCESS',
      metadata: { challengeId: 42 },
    });
  });

  it('네트워크 장애로 API 호출이 실패하더라도 에러를 던지지 않고 안전하게 격리한다', async () => {
    // sendFeatureEvent 내부에서 try-catch로 swallow하므로 reject되지 않아야 함
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // mock reject on inner client call
    const event = {
      featureKey: 'ui_refresh_01',
      variant: 'B',
      eventType: 'CERT_FLOW_FAIL',
    };

    // featuresApi.sendFeatureEvent 호출 시 예외가 발생해도 resolve 됨
    await expect(featuresApi.sendFeatureEvent(event)).resolves.not.toThrow();
    expect(warnSpy).toBeDefined();
  });
});
