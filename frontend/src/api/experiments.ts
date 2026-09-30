import type { ExperimentAssignmentResponse } from '../types/experiment';

/**
 * Experiment Variant 조회 API 클라이언트 (F04)
 *
 * apiClient(axios)를 일부러 쓰지 않는다. 응답 인터셉터가 5xx·네트워크 오류에 전역 토스트를 띄우고
 * 401이면 /login으로 강제 이동시키는데, 실험 조회 실패는 사용자에게 보여야 할 오류가 아니다.
 * 실패는 전부 null로 돌려주고 호출부가 기본 경험으로 Fallback한다.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/** 실험 조회가 늦어도 화면이 기본 경험으로 넘어갈 수 있도록 짧게 끊는다. */
export const EXPERIMENT_REQUEST_TIMEOUT_MS = 3000;

export const experimentAssignmentEndpoint = (experimentKey: string): string =>
  `${API_BASE_URL}/experiments/${encodeURIComponent(experimentKey)}/assignment`;

function readAccessToken(): string | null {
  try {
    return localStorage.getItem('accessToken');
  } catch {
    return null;
  }
}

/** 절대 throw하지 않는다. 미인증·오류·타임아웃은 모두 null. */
export async function fetchExperimentAssignment(
  experimentKey: string
): Promise<ExperimentAssignmentResponse | null> {
  if (typeof fetch !== 'function') return null;

  const token = readAccessToken();
  if (!token) return null;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), EXPERIMENT_REQUEST_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(experimentAssignmentEndpoint(experimentKey), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller?.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as ExperimentAssignmentResponse;
  } catch {
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
