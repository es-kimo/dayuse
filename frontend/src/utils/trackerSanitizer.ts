import type { EventProperties } from '../types/analytics';

/**
 * 클라이언트 측 1차 방어 필터.
 * 백엔드 ProductEventPropertiesValidator와 같은 규칙을 미러링하되, 서버는 400으로 거부하지만
 * 클라이언트는 해당 항목만 조용히 제거해 나머지 이벤트는 그대로 보낸다.
 */
export const FORBIDDEN_NORMALIZED_KEYS: ReadonlySet<string> = new Set([
  // 인증 사진 및 이미지/미디어 URL
  'image', 'imageurl', 'photo', 'photourl', 's3key', 'fileurl', 'mediaurl', 'thumbnailurl',
  // 인증 문구, 댓글 내용, 자유 입력 원문
  'content', 'comment', 'commentcontent', 'message', 'memo', 'text', 'description', 'body', 'note',
  // 이름·닉네임 등 표시 문자열 및 개인식별정보
  'name', 'nickname', 'username', 'displayname', 'email', 'phone', 'phonenumber', 'profileimage',
  // 계좌번호·예금주·입금자명 등 금융/정산 민감정보
  'accountnumber', 'accountholder', 'depositor', 'depositorname', 'bankname', 'bankaccount',
  // 인증/세션 토큰 및 보안 정보
  'token', 'accesstoken', 'refreshtoken', 'idtoken', 'authorization', 'password', 'secret',
  // userId는 서버 인증 정보로만 기록
  'userid',
]);

export const FORBIDDEN_VALUE_PREFIXES = ['http://', 'https://', 's3://', 'data:image/'];

export const MAX_STRING_PROPERTY_LENGTH = 100;

export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, '');
}

/** 금지 키, URL/이미지 경로 값, 긴 자유 입력, 원시 타입이 아닌 값을 제거한 새 객체를 돌려준다. */
export function sanitizeProperties(_properties: Record<string, unknown> = {}): EventProperties {
  // TODO [사용자 미션 3]: properties에서 민감정보·콘텐츠 유입을 걸러낸 새 객체를 반환하세요.
  //   - 어떤 키를 막을까요? 표기가 달라도(photoUrl / photo_url / Photo-Url) 같은 키로 봐야 합니다. (normalizeKey, FORBIDDEN_NORMALIZED_KEYS)
  //   - 어떤 값을 막을까요? (FORBIDDEN_VALUE_PREFIXES, MAX_STRING_PROPERTY_LENGTH, 원시 타입 여부, NaN/Infinity)
  //   - 서버는 위반 시 400으로 거부하지만, 클라이언트는 위반 항목만 제거하고 나머지는 보냅니다. 왜 그럴까요?
  //   - 입력 객체를 변경하지 않아야 합니다.
  throw new Error('TODO [사용자 미션 3]: sanitizeProperties 구현 필요');
}
