import { describe, it, expect } from 'vitest';
import { MAX_STRING_PROPERTY_LENGTH, sanitizeProperties } from './trackerSanitizer';

describe('Tracker 민감정보 1차 방어 필터 (F02)', () => {
  it('허용된 키와 원시 타입 값(문자열·숫자·불리언·null)은 그대로 통과한다', () => {
    const input = { challengeId: 12, groupId: 'g_3', isLate: false, reason: null, source: 'home' };
    expect(sanitizeProperties(input)).toEqual(input);
  });

  it('금지 키는 표기(camelCase, snake_case, kebab-case, 대소문자)와 무관하게 제거한다', () => {
    const result = sanitizeProperties({
      photoUrl: 'x',
      photo_url: 'x',
      'user-id': 1,
      UserId: 1,
      comment: '오늘도 완료',
      accessToken: 'abc',
      accountNumber: '123',
      nickname: '하루',
      challengeId: 1,
    });
    expect(result).toEqual({ challengeId: 1 });
  });

  it('URL·이미지 경로로 시작하는 문자열 값은 대소문자·앞 공백과 무관하게 제거한다', () => {
    const result = sanitizeProperties({
      a: 'https://example.com/p.png',
      b: 'HTTP://example.com',
      c: '  s3://bucket/key',
      d: 'data:image/png;base64,AAA',
      ok: 'home',
    });
    expect(result).toEqual({ ok: 'home' });
  });

  it(`${MAX_STRING_PROPERTY_LENGTH}자를 넘는 문자열은 제거하고 정확히 ${MAX_STRING_PROPERTY_LENGTH}자는 허용한다`, () => {
    const result = sanitizeProperties({
      tooLong: 'a'.repeat(MAX_STRING_PROPERTY_LENGTH + 1),
      exact: 'a'.repeat(MAX_STRING_PROPERTY_LENGTH),
    });
    expect(Object.keys(result)).toEqual(['exact']);
  });

  it('객체·배열·undefined·NaN·함수 값은 제거한다', () => {
    const result = sanitizeProperties({
      obj: { a: 1 },
      arr: [1],
      undef: undefined,
      nan: Number.NaN,
      inf: Number.POSITIVE_INFINITY,
      fn: () => 1,
      ok: 1,
    });
    expect(result).toEqual({ ok: 1 });
  });

  it('빈 키는 제거하고 키 앞뒤 공백은 다듬는다', () => {
    expect(sanitizeProperties({ '  ': 1, ' challengeId ': 2 })).toEqual({ challengeId: 2 });
  });

  it('입력이 없거나 비어 있으면 빈 객체를 돌려주고 입력 객체를 변경하지 않는다', () => {
    expect(sanitizeProperties()).toEqual({});
    const input = { userId: 1, challengeId: 2 };
    sanitizeProperties(input);
    expect(input).toEqual({ userId: 1, challengeId: 2 });
  });

  it('유효한 experiment 컨텍스트({ experimentKey, variant })는 허용하고 추가 필드나 잘못된 형식은 제거한다', () => {
    const valid = sanitizeProperties({
      challengeId: 10,
      experiment: {
        experimentKey: 'challenge-invite-copy-v1',
        variant: 'B',
        extraSecret: 'leaked',
      },
    });
    expect(valid).toEqual({
      challengeId: 10,
      experiment: {
        experimentKey: 'challenge-invite-copy-v1',
        variant: 'B',
      },
    });

    const invalidVariant = sanitizeProperties({
      challengeId: 10,
      experiment: {
        experimentKey: 'challenge-invite-copy-v1',
        variant: 'C',
      },
    });
    expect(invalidVariant).toEqual({ challengeId: 10 });

    const invalidKey = sanitizeProperties({
      challengeId: 10,
      experiment: {
        experimentKey: 'Invalid_Key',
        variant: 'A',
      },
    });
    expect(invalidKey).toEqual({ challengeId: 10 });
  });
});
