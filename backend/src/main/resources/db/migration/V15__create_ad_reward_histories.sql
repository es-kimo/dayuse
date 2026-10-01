-- V15: 광고 시청 완료 보상 지급 이력 테이블 생성 (v0.11 F09, F10)
CREATE TABLE IF NOT EXISTS `ad_reward_histories` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL COMMENT '보상 지급 대상 광고 세션 ID',
  `session_token` VARCHAR(64) NOT NULL COMMENT '광고 세션 토큰',
  `user_id` BIGINT NOT NULL COMMENT '보상 수령 계정 ID',
  `daily_record_id` BIGINT NOT NULL COMMENT '광고 요청 당시 대상 일일 기록 ID',
  `ticket_id` BIGINT NOT NULL COMMENT '발급된 리데이 티켓 ID',
  `granted_at` DATETIME NOT NULL COMMENT '보상 지급 시각 (KST)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_ad_reward_history_session` (`session_id`),
  UNIQUE INDEX `uk_ad_reward_history_session_token` (`session_token`),
  UNIQUE INDEX `uk_ad_reward_history_ticket` (`ticket_id`),
  INDEX `idx_ad_reward_history_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
