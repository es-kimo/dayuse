import { apiClient } from './client';
import type {
  AdAbandonResponse,
  AdImpressionResponse,
  AdSessionIssueResponse,
  ApplyRedayPayload,
  ApplyRedayResponse,
  CompleteAdSessionResponse,
  RedayTicketBalance,
} from '../types';

/**
 * 리데이 티켓 및 보상형 광고 API 클라이언트 (v0.11 F11~F12)
 *
 * 잔액·이력은 본인에게만 노출되는 값이므로 서버가 인증 정보로 주체를 확정한다.
 * 클라이언트는 어떤 경로에도 userId를 싣지 않는다.
 */
export const redayApi = {
  getTicketBalance: async (): Promise<RedayTicketBalance> => {
    const res = await apiClient.get<RedayTicketBalance>('/reday-tickets/balance');
    return res.data;
  },

  /**
   * 리데이 적용(티켓 소비 + 벌금 면제).
   * 같은 기록에 대한 재요청은 서버가 멱등 응답을 돌려준다.
   */
  applyReday: async (payload: ApplyRedayPayload): Promise<ApplyRedayResponse> => {
    const res = await apiClient.post<ApplyRedayResponse>('/reday-tickets/apply', payload);
    return res.data;
  },

  /** 광고 세션 발급. 광고가 없으면 available=false와 사유가 돌아온다(에러가 아니다). */
  requestAdSession: async (dailyRecordId: number): Promise<AdSessionIssueResponse> => {
    const res = await apiClient.post<AdSessionIssueResponse>('/ads/sessions', { dailyRecordId });
    return res.data;
  },

  recordAdImpression: async (sessionToken: string): Promise<AdImpressionResponse> => {
    const res = await apiClient.post<AdImpressionResponse>(
      `/ads/sessions/${encodeURIComponent(sessionToken)}/impression`
    );
    return res.data;
  },

  abandonAdSession: async (sessionToken: string): Promise<AdAbandonResponse> => {
    const res = await apiClient.post<AdAbandonResponse>(
      `/ads/sessions/${encodeURIComponent(sessionToken)}/abandon`
    );
    return res.data;
  },

  completeAdSession: async (
    sessionToken: string,
    watchedSeconds: number
  ): Promise<CompleteAdSessionResponse> => {
    const res = await apiClient.post<CompleteAdSessionResponse>(
      `/ads/sessions/${encodeURIComponent(sessionToken)}/complete`,
      { watchedSeconds }
    );
    return res.data;
  },
};

/**
 * 모달이 닫히거나 탭이 사라지는 순간의 시청 중단 통보.
 *
 * apiClient(axios)를 쓰지 않는다. 언마운트 중 요청이 끊기면 응답 인터셉터가 전역 토스트를 띄우는데,
 * 사용자가 스스로 닫은 광고의 중단 통보 실패는 보여줄 오류가 아니다.
 * `keepalive`로 페이지 이탈 중에도 전송을 시도하고, 실패는 조용히 삼킨다.
 */
export async function reportAdAbandonQuietly(sessionToken: string): Promise<void> {
  if (typeof fetch !== 'function') return;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('accessToken');
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch(`${baseUrl}/ads/sessions/${encodeURIComponent(sessionToken)}/abandon`, {
      method: 'POST',
      headers,
      keepalive: true,
    });
  } catch {
    // 중단 통보 실패는 사용자 흐름에 영향을 주지 않는다. 세션은 서버 유효기간이 지나면 만료된다.
  }
}
