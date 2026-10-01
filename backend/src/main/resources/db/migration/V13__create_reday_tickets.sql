-- V13: 리데이 티켓 테이블 생성 (v0.11 F05, F06)
CREATE TABLE IF NOT EXISTS `reday_tickets` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '티켓 소유 계정 ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' COMMENT 'AVAILABLE | USED',
  `source` VARCHAR(50) NOT NULL DEFAULT 'REWARD_AD' COMMENT '발급 출처 (REWARD_AD, ADMIN_GRANT 등)',
  `source_reference` VARCHAR(200) DEFAULT NULL COMMENT '발급 출처 참조 (광고 세션 ID 등)',
  `used_daily_record_id` BIGINT DEFAULT NULL COMMENT '사용된 대상 일일 기록 ID',
  `used_at` DATETIME DEFAULT NULL COMMENT '사용 시각 (KST)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_reday_ticket_user_id` (`user_id`),
  INDEX `idx_reday_ticket_status` (`status`),
  INDEX `idx_reday_ticket_used_record` (`used_daily_record_id`),
  UNIQUE INDEX `uk_reday_ticket_used_record` (`used_daily_record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
