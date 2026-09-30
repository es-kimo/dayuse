import type { EventName, EventProperties, TrackedEventPayload } from '../types/analytics';

/**
 * Frontend Tracker (F02)
 *
 * 화면 코드는 track(eventName, properties)만 안다. Event API 경로, 헤더, 재시도, 실패 처리는 이 모듈 안에 갇힌다.
 * track()은 동기적으로 void를 반환하고, 어떤 경우에도 throw하지 않는다.
 */

/** 첫 전송 이후 재시도 간격(ms). 총 최대 3회 전송(첫 시도 + 2회 재시도). */
export const RETRY_DELAYS_MS = [1000, 3000] as const;
export const JITTER_RATIO = 0.2;

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

export function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 이벤트 발생 시점에 공통 메타데이터를 고정해 페이로드를 만든다.
 */
export function buildEvent(
  _eventName: EventName,
  _properties: Record<string, unknown> = {}
): TrackedEventPayload {
  // TODO [사용자 미션 1]: 공통 메타데이터를 채운 TrackedEventPayload를 만들어 반환하세요.
  //   - eventId, occurredAt, sessionId, schemaVersion, appVersion을 각각 어디서, 언제 만들어야 할까요?
  //   - properties는 전송 전에 어떤 처리를 거쳐야 할까요?
  //   - 쓸 수 있는 재료: generateEventId(), toOffsetIsoString(), getOrCreateSessionId()(./analytics),
  //     APP_VERSION / EVENT_SCHEMA_VERSION(../constants/appVersion), sanitizeProperties(./trackerSanitizer)
  throw new Error('TODO [사용자 미션 1]: buildEvent 구현 필요');
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const withJitter = (ms: number) =>
  Math.round(ms * (1 - JITTER_RATIO + Math.random() * JITTER_RATIO * 2));

/**
 * 페이로드를 Event API로 전달한다. 일시 오류일 때만 재시도한다.
 */
export async function deliver(_payload: TrackedEventPayload): Promise<void> {
  // TODO [사용자 미션 2]: 전송과 재시도 제어를 구현하세요.
  //   - 재시도할 때 eventId와 occurredAt은 어떻게 유지해야 할까요?
  //   - 어떤 결과(SendResult: 'ok' | 'retry' | 'drop')에서 재시도하고, 어디서 멈춰야 할까요?
  //   - 재시도 간격은 RETRY_DELAYS_MS 기준에 JITTER_RATIO만큼 흔들어 주세요 (sleep, withJitter 사용 가능).
  //   - 이 함수가 reject되면 호출부는 어떻게 될까요? 어떤 경우에도 호출 측이 영향받지 않게 하세요.
  //   - 전송 1회는 sendTrackedEvent(../api/events)가 담당합니다. 절대 throw하지 않고 SendResult를 돌려줍니다.
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
