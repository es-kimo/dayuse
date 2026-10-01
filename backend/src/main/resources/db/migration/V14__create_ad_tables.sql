-- V14: 자체 광고 캠페인, 소재, 광고 세션 테이블 생성 (v0.11 F07, F08, F09, F10)
CREATE TABLE IF NOT EXISTS `ad_campaigns` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `campaign_key` VARCHAR(100) NOT NULL COMMENT '캠페인 고유 식별 키 (시드 및 관리용)',
  `title` VARCHAR(100) NOT NULL COMMENT '캠페인 제목',
  `slot_type` VARCHAR(50) NOT NULL DEFAULT 'REDAY_TICKET_REWARD' COMMENT '노출 슬롯 식별자 (리데이 티켓 획득용 1개 고정)',
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT | ACTIVE | PAUSED',
  `priority` INT NOT NULL DEFAULT 0 COMMENT '노출 우선순위 (높을수록 우선 선택)',
  `daily_impression_limit` INT NOT NULL DEFAULT 3 COMMENT '캠페인별 사용자당 하루 실제 노출(impression) 상한',
  `start_at` DATETIME NOT NULL COMMENT '운영 시작 일시 (KST)',
  `end_at` DATETIME NOT NULL COMMENT '운영 종료 일시 (KST)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_ad_campaign_key` (`campaign_key`),
  INDEX `idx_ad_campaign_slot_status` (`slot_type`, `status`, `priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ad_creatives` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `campaign_id` BIGINT NOT NULL COMMENT '소속 캠페인 ID',
  `title` VARCHAR(120) NOT NULL COMMENT '소재 안내 제목',
  `description` TEXT NOT NULL COMMENT '소재 안내 본문 문구',
  `image_url` VARCHAR(500) DEFAULT NULL COMMENT '배너/안내 이미지 URL (선택)',
  `cta_text` VARCHAR(80) DEFAULT NULL COMMENT '보조 안내 문구 (선택)',
  `badge_text` VARCHAR(120) NOT NULL DEFAULT 'dayuse 자체 안내 · 시청 완료 시 리데이 티켓 1장' COMMENT '자체 안내 필수 표기 문구',
  `min_watch_seconds` INT NOT NULL DEFAULT 10 COMMENT '최소 시청 시간 (초, 기본 10초)',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '소재 활성 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ad_creative_campaign_active` (`campaign_id`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ad_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_token` VARCHAR(64) NOT NULL COMMENT '외부 API 통신용 세션 토큰 (UUID)',
  `user_id` BIGINT NOT NULL COMMENT '요청 계정 ID',
  `daily_record_id` BIGINT NOT NULL COMMENT '대상 지각 인증 일일 기록 ID',
  `campaign_id` BIGINT NOT NULL COMMENT '선택된 캠페인 ID',
  `creative_id` BIGINT NOT NULL COMMENT '선택된 소재 ID',
  `slot_type` VARCHAR(50) NOT NULL DEFAULT 'REDAY_TICKET_REWARD' COMMENT '요청 슬롯',
  `status` VARCHAR(20) NOT NULL DEFAULT 'ISSUED' COMMENT 'ISSUED | IMPRESSED | COMPLETED | ABANDONED | EXPIRED',
  `required_watch_seconds` INT NOT NULL DEFAULT 10 COMMENT '발급 시점 스냅샷된 최소 시청 시간(초)',
  `issued_at` DATETIME NOT NULL COMMENT '세션 발급 시각 (KST)',
  `expires_at` DATETIME NOT NULL COMMENT '세션 만료 시각 (issued_at + 10분)',
  `impression_at` DATETIME DEFAULT NULL COMMENT '최초 실제 화면 노출 시각 (일일 노출 상한 기준)',
  `completed_at` DATETIME DEFAULT NULL COMMENT '시청 완료 시각 (KST)',
  `abandoned_at` DATETIME DEFAULT NULL COMMENT '시청 중단 시각 (KST)',
  `granted_ticket_id` BIGINT DEFAULT NULL COMMENT '지급된 리데이 티켓 ID (세션당 최대 1장 보장)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_ad_session_token` (`session_token`),
  UNIQUE INDEX `uk_ad_session_granted_ticket` (`granted_ticket_id`),
  INDEX `idx_ad_session_user_status` (`user_id`, `status`),
  INDEX `idx_ad_session_campaign_user_impression` (`campaign_id`, `user_id`, `impression_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
