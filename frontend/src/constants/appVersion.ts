/** 백엔드 product_events.app_version 컬럼 길이(32)에 맞춘다. */
const MAX_APP_VERSION_LENGTH = 32;

/** 배포 시 VITE_APP_VERSION으로 주입한다. 비우면 마지막 릴리즈 버전(sw.js 캐시 버전과 동일)을 쓴다. */
export const APP_VERSION: string = (import.meta.env.VITE_APP_VERSION || '0.8.1').slice(
  0,
  MAX_APP_VERSION_LENGTH
);

/** Tracker 이벤트 스키마 버전. 페이로드 형태가 바뀔 때 올린다. */
export const EVENT_SCHEMA_VERSION = 1;
