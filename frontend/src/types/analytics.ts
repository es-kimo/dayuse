import type { ExperimentVariant } from './experiment';

/**
 * Frontend Tracker 이벤트 타입 (F02, v0.10 F06)
 * 이벤트 이름은 백엔드 ProductEventName 표준 목록과 1:1로 맞춘다.
 */
export type EventName =
  | 'home_viewed'
  | 'certification_started'
  | 'certification_completed'
  | 'certification_failed'
  | 'challenge_created'
  | 'challenge_created_reday_allowed'
  | 'challenge_joined'
  | 'share_clicked'
  | 'experiment_exposed';

/**
 * 전환 및 행동 이벤트 `properties`에 연결되는 Experiment Context 구조 (v0.10 F06)
 */
export interface ExperimentContextPayload {
  experimentKey: string;
  variant: ExperimentVariant;
}

/** 백엔드 검증 기준: 값은 원시 타입(String, Number, Boolean), null 및 표준 ExperimentContextPayload만 허용 */
export type EventPropertyValue =
  | string
  | number
  | boolean
  | null
  | ExperimentContextPayload;

export type EventProperties = Record<string, EventPropertyValue>;

/**
 * Event API로 전송되는 페이로드.
 * userId는 일부러 없다. 서버가 인증 정보로 확정한다.
 */
export interface TrackedEventPayload {
  eventId: string;
  eventName: EventName;
  /** 행동 발생 시각. 오프셋 포함 ISO-8601 (예: 2026-09-30T19:11:17.123+09:00) */
  occurredAt: string;
  sessionId: string;
  schemaVersion: number;
  appVersion: string;
  properties: EventProperties;
}
