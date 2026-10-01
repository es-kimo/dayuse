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
  | 'experiment_exposed'
  // v0.11 F13: 리데이·광고·티켓. 내부 식별자는 `recovery_*`를 유지한다.
  // 지급·사용·완료(reward_granted, recovery_ticket_*, recovery_completed)는 서버가 실제 최초 처리
  // 시점에 적재한다. 클라이언트가 멱등 응답마다 쏘면 지급 1건이 N건으로 집계되기 때문이다.
  // 화면이 직접 보내는 것은 서버에 대응물이 없는 진입 행동(`recovery_started`)뿐이다.
  | 'late_certification_completed'
  | 'recovery_offered'
  | 'recovery_started'
  | 'recovery_completed'
  | 'recovery_expired'
  | 'recovery_failed'
  | 'ad_requested'
  | 'ad_served'
  | 'ad_impression'
  | 'ad_completed'
  | 'ad_abandoned'
  | 'ad_unavailable'
  | 'reward_granted'
  | 'recovery_ticket_granted'
  | 'recovery_ticket_used';

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
