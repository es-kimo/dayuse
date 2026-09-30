import type { TrackedEventPayload } from '../types/analytics';

/**
 * Event API 전송 (1회 시도).
 *
 * apiClient(axios)를 일부러 쓰지 않는다. 응답 인터셉터가 네트워크 오류·5xx에 전역 토스트를 띄우고
 * 401이면 /login으로 강제 이동시키기 때문에, 분석 이벤트 실패가 사용자 화면에 드러난다.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const EVENTS_ENDPOINT = `${API_BASE_URL}/events`;
export const EVENT_REQUEST_TIMEOUT_MS = 3000;

/**
 * ok: 저장됨 / retry: 일시 오류라 같은 페이로드로 재시도 가능 / drop: 다시 보내도 소용없음(4xx 등)
 */
export type SendResult = 'ok' | 'retry' | 'drop';

function readAccessToken(): string | null {
  try {
    return localStorage.getItem('accessToken');
  } catch {
    return null;
  }
}

/** 절대 throw하지 않는다. 모든 실패를 SendResult로 돌려준다. */
export async function sendTrackedEvent(payload: TrackedEventPayload): Promise<SendResult> {
  if (typeof fetch !== 'function') return 'drop';

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), EVENT_REQUEST_TIMEOUT_MS) : null;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = readAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(EVENTS_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
      signal: controller?.signal,
    });

    if (response.ok) return 'ok';
    if (response.status === 429 || response.status >= 500) return 'retry';
    return 'drop';
  } catch {
    return 'retry';
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
