import { sendTrackedEvent } from '../api/events';
import { APP_VERSION, EVENT_SCHEMA_VERSION } from '../constants/appVersion';
import type { EventName, EventProperties, TrackedEventPayload } from '../types/analytics';
import { getOrCreateSessionId } from './analytics';
import { sanitizeProperties } from './trackerSanitizer';

/**
 * Frontend Tracker (F02)
 *
 * 화면 코드는 track(eventName, properties)만 안다. Event API 경로, 헤더, 재시도, 실패 처리는 이 모듈 안에 갇힌다.
 * track()은 동기적으로 void를 반환하고, 어떤 경우에도 throw하지 않는다.
 */

/** 첫 전송 이후 재시도 간격(ms). 총 최대 3회 전송(첫 시도 + 2회 재시도). */
export const RETRY_DELAYS_MS = [1000, 3000] as const;
const JITTER_RATIO = 0.2;

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/** 로컬 시간대 오프셋을 포함한 ISO-8601 문자열 (예: 2026-09-30T19:11:17.123+09:00) */
export function toOffsetIsoString(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}` +
    `${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`
  );
}

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 이벤트 발생 시점에 공통 메타데이터를 고정한다.
 * eventId와 occurredAt은 여기서 딱 한 번 만들어지고, 이후 재시도는 이 객체를 그대로 재사용한다.
 */
export function buildEvent(
  eventName: EventName,
  properties: Record<string, unknown> = {}
): TrackedEventPayload {
  return {
    eventId: generateEventId(),
    eventName,
    occurredAt: toOffsetIsoString(new Date()),
    sessionId: getOrCreateSessionId(),
    schemaVersion: EVENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    properties: sanitizeProperties(properties),
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const withJitter = (ms: number) =>
  Math.round(ms * (1 - JITTER_RATIO + Math.random() * JITTER_RATIO * 2));

/**
 * 같은 페이로드(동일 eventId·occurredAt)로 일시 오류만 재시도한다.
 * 절대 reject하지 않는다. 4xx는 재시도해도 소용없으므로 즉시 포기한다.
 */
export async function deliver(payload: TrackedEventPayload): Promise<void> {
  try {
    for (let attempt = 0; ; attempt += 1) {
      const result = await sendTrackedEvent(payload);
      if (result !== 'retry') return;

      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) return;
      await sleep(withJitter(delay));
    }
  } catch {
    // 분석 전송 실패는 사용자 흐름에 영향을 주지 않는다.
  }
}

/**
 * 행동 이벤트를 기록한다. fire-and-forget이므로 await할 필요가 없다.
 *
 * @example track('certification_started', { challengeId, groupId });
 */
export function track(eventName: EventName, properties?: EventProperties): void {
  try {
    void deliver(buildEvent(eventName, properties));
  } catch {
    // buildEvent 실패(스토리지 접근 불가 등)도 호출부에 전파하지 않는다.
  }
}
