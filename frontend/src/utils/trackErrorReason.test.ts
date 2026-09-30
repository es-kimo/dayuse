import { describe, expect, it } from 'vitest';
import { toFailureReason, toStatusCode } from './trackErrorReason';

describe('toFailureReason', () => {
  it('5xx 응답은 server_error로 분류한다', () => {
    expect(toFailureReason({ response: { status: 500 } })).toBe('server_error');
    expect(toFailureReason({ response: { status: 503 } })).toBe('server_error');
  });

  it('4xx 응답은 client_error로 분류한다', () => {
    expect(toFailureReason({ response: { status: 400 } })).toBe('client_error');
    expect(toFailureReason({ response: { status: 409 } })).toBe('client_error');
  });

  it('상태 코드가 없으면 axios code로 네트워크/타임아웃/취소를 구분한다', () => {
    expect(toFailureReason({ code: 'ERR_NETWORK' })).toBe('network');
    expect(toFailureReason({ code: 'ECONNABORTED' })).toBe('timeout');
    expect(toFailureReason({ code: 'ERR_CANCELED' })).toBe('canceled');
  });

  it('code도 없으면 메시지에서 거친 분류만 뽑는다', () => {
    expect(toFailureReason(new Error('Network Error'))).toBe('network');
    expect(toFailureReason(new Error('timeout of 3000ms exceeded'))).toBe('timeout');
    expect(toFailureReason(new Error('The operation was aborted'))).toBe('canceled');
  });

  it('분류할 수 없거나 값이 없으면 unknown을 돌려주고 throw하지 않는다', () => {
    expect(toFailureReason(undefined)).toBe('unknown');
    expect(toFailureReason(null)).toBe('unknown');
    expect(toFailureReason({})).toBe('unknown');
    expect(toFailureReason('그냥 문자열')).toBe('unknown');
    expect(toFailureReason({ response: { status: '500' } })).toBe('unknown');
  });

  it('서버 메시지 원문은 결과에 섞이지 않는다', () => {
    const reason = toFailureReason({
      response: { status: 400 },
      message: '홍길동님의 인증 사진 https://cdn/x.png 업로드 실패',
    });
    expect(reason).toBe('client_error');
  });
});

describe('toStatusCode', () => {
  it('숫자 상태 코드만 그대로 돌려준다', () => {
    expect(toStatusCode({ response: { status: 409 } })).toBe(409);
    expect(toStatusCode({ response: { status: '409' } })).toBeNull();
    expect(toStatusCode(new Error('boom'))).toBeNull();
    expect(toStatusCode(null)).toBeNull();
  });
});
