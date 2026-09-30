import type { EventProperties, ExperimentContextPayload } from '../types/analytics';
import { isValidVariant } from './experiment';

/**
 * 클라이언트 측 1차 방어 필터.
 * 백엔드 ProductEventPropertiesValidator와 같은 규칙을 미러링하되, 서버는 400으로 거부하지만
 * 클라이언트는 해당 항목만 조용히 제거해 나머지 이벤트는 그대로 보낸다.
 */
const FORBIDDEN_NORMALIZED_KEYS: ReadonlySet<string> = new Set([
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

const FORBIDDEN_VALUE_PREFIXES = ['http://', 'https://', 's3://', 'data:image/'];
const EXPERIMENT_KEY_REGEX = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;

export const MAX_STRING_PROPERTY_LENGTH = 100;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, '');
}

function isSafeValue(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (FORBIDDEN_VALUE_PREFIXES.some((prefix) => lowered.startsWith(prefix))) return false;
    return value.length <= MAX_STRING_PROPERTY_LENGTH;
  }
  return false;
}

function sanitizeExperimentContext(raw: unknown): ExperimentContextPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Record<string, unknown>;
  const rawKey = typeof candidate.experimentKey === 'string' ? candidate.experimentKey.trim() : '';
  const rawVariant = typeof candidate.variant === 'string' ? candidate.variant.trim().toUpperCase() : '';

  if (!EXPERIMENT_KEY_REGEX.test(rawKey) || !isValidVariant(rawVariant)) {
    return null;
  }

  return {
    experimentKey: rawKey,
    variant: rawVariant,
  };
}

/** 금지 키, URL/이미지 경로 값, 긴 자유 입력, 원시 타입이 아닌 값을 제거한 새 객체를 돌려준다. */
export function sanitizeProperties(properties: Record<string, unknown> = {}): EventProperties {
  const sanitized: EventProperties = {};
  for (const [rawKey, value] of Object.entries(properties)) {
    const key = rawKey.trim();
    if (key === '') continue;
    if (FORBIDDEN_NORMALIZED_KEYS.has(normalizeKey(key))) continue;

    if (key === 'experiment') {
      const sanitizedContext = sanitizeExperimentContext(value);
      if (sanitizedContext) {
        sanitized.experiment = sanitizedContext;
      }
      continue;
    }

    if (!isSafeValue(value)) continue;
    sanitized[key] = value as EventProperties[string];
  }
  return sanitized;
}
