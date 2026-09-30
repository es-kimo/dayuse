/**
 * 실패 이벤트(`certification_failed`)의 사유를 거친 분류값으로 환원한다. (F03)
 *
 * 서버 에러 메시지 원문은 사용자 입력이나 식별 정보를 품을 수 있어 properties에 싣지 않는다.
 * 퍼널 분석에 필요한 것은 "무엇 때문에 실패했는가"의 범주뿐이다.
 */
export type TrackFailureReason =
  | 'network'
  | 'timeout'
  | 'canceled'
  | 'client_error'
  | 'server_error'
  | 'unknown';

interface HttpLikeError {
  code?: unknown;
  message?: unknown;
  response?: { status?: unknown } | null;
}

export function toFailureReason(error: unknown): TrackFailureReason {
  const err = (error ?? {}) as HttpLikeError;

  const status = typeof err.response?.status === 'number' ? err.response.status : undefined;
  if (status !== undefined) {
    if (status >= 500) return 'server_error';
    if (status >= 400) return 'client_error';
  }

  const code = typeof err.code === 'string' ? err.code : '';
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') return 'timeout';
  if (code === 'ERR_CANCELED') return 'canceled';
  if (code === 'ERR_NETWORK') return 'network';

  const message = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('abort') || message.includes('cancel')) return 'canceled';
  if (message.includes('network') || message.includes('failed to fetch')) return 'network';

  return 'unknown';
}

/** 응답 상태 코드가 있으면 숫자로, 없으면 null. properties의 statusCode 값으로 쓴다. */
export function toStatusCode(error: unknown): number | null {
  const status = ((error ?? {}) as HttpLikeError).response?.status;
  return typeof status === 'number' ? status : null;
}
