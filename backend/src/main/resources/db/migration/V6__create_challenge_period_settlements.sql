-- 1. challenge_period_settlements 테이블 생성 (주 N회 구간 정산 및 본인 확정 관리)
CREATE TABLE IF NOT EXISTS `challenge_period_settlements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `challenge_id` bigint NOT NULL,
  `challenge_participant_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `group_id` bigint NOT NULL,
  `period_index` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `target_count` int NOT NULL,
  `completed_count` int NOT NULL,
  `missed_count` int NOT NULL,
  `penalty_amount_per_miss` int NOT NULL,
  `total_penalty_amount` int NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deposit_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `confirmed_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_participant_period_index` (`challenge_participant_id`, `period_index`),
  KEY `idx_period_settlement_challenge_id` (`challenge_id`),
  KEY `idx_period_settlement_participant_id` (`challenge_participant_id`),
  KEY `idx_period_settlement_user_id` (`user_id`),
  KEY `idx_period_settlement_group_id` (`group_id`),
  KEY `idx_period_settlement_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. deposit_report_items 테이블에 주 N회 구간 정산 매핑을 위한 컬럼 및 제약조건 수정
ALTER TABLE `deposit_report_items`
  MODIFY COLUMN `daily_record_id` bigint NULL,
  ADD COLUMN `period_settlement_id` bigint NULL,
  ADD KEY `idx_deposit_report_item_period_id` (`period_settlement_id`);
