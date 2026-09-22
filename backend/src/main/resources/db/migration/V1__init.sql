CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `kakao_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_kakao_id` (`kakao_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `host_user_id` bigint NOT NULL,
  `invite_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invite_code_issued_at` datetime(6) NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_groups_invite_code` (`invite_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `group_members` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `group_id` bigint NOT NULL,
  `joined_at` datetime(6) NOT NULL,
  `role` enum('HOST','MEMBER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_member` (`group_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `group_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `account_holder` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_account_group_id` (`group_id`),
  KEY `idx_group_account_group_id` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `challenges` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `creator_user_id` bigint NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `end_date` date NOT NULL,
  `group_id` bigint NOT NULL,
  `start_date` date NOT NULL,
  `title` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verification_criteria` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_challenge_group_id` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `challenge_participants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `challenge_id` bigint NOT NULL,
  `joined_at` datetime(6) NOT NULL,
  `penalty_amount` int NOT NULL,
  `user_id` bigint NOT NULL,
  `status` enum('ACTIVE','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_challenge_user` (`challenge_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `verifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `challenge_id` bigint NOT NULL,
  `comment` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `group_id` bigint NOT NULL,
  `image_url` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_late` bit(1) NOT NULL,
  `target_date` date NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_verification_challenge_user_date` (`challenge_id`,`user_id`,`target_date`),
  KEY `idx_verification_group_id` (`group_id`),
  KEY `idx_verification_challenge_id` (`challenge_id`),
  KEY `idx_verification_user_id` (`user_id`),
  KEY `idx_verification_target_date` (`target_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `verification_comments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `content` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `verification_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_comment_verification_id` (`verification_id`),
  KEY `idx_comment_user_id` (`user_id`),
  CONSTRAINT `fk_verification_comment_verification` FOREIGN KEY (`verification_id`) REFERENCES `verifications` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `daily_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `challenge_id` bigint NOT NULL,
  `challenge_participant_id` bigint NOT NULL,
  `date` date NOT NULL,
  `deposit_status` enum('CONFIRMED','UNPAID','WAITING_CONFIRMATION') COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` datetime(6) DEFAULT NULL,
  `group_id` bigint NOT NULL,
  `is_late` bit(1) NOT NULL,
  `penalty_amount` int NOT NULL,
  `status` enum('COMPLETED','FAILED','NOT_PARTICIPATED','PLANNED','UNCHECKED','WAITING') COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `verification_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_participant_date` (`challenge_participant_id`,`date`),
  KEY `idx_daily_record_group_id` (`group_id`),
  KEY `idx_daily_record_challenge_id` (`challenge_id`),
  KEY `idx_daily_record_participant_id` (`challenge_participant_id`),
  KEY `idx_daily_record_user_id` (`user_id`),
  KEY `idx_daily_record_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `deposit_reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `cancel_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deposit_date` date NOT NULL,
  `depositor_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_id` bigint NOT NULL,
  `processed_at` datetime(6) DEFAULT NULL,
  `processed_by_user_id` bigint DEFAULT NULL,
  `reject_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('CANCELLED','CONFIRMED','REJECTED','WAITING_CONFIRMATION') COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_amount` int NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_deposit_report_group_id` (`group_id`),
  KEY `idx_deposit_report_user_id` (`user_id`),
  KEY `idx_deposit_report_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `deposit_report_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `daily_record_id` bigint NOT NULL,
  `deposit_report_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_deposit_report_item_report_record` (`deposit_report_id`,`daily_record_id`),
  KEY `idx_deposit_report_item_report_id` (`deposit_report_id`),
  KEY `idx_deposit_report_item_record_id` (`daily_record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `deposit_audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `action` enum('CANCELLED_BY_USER','CONFIRMATION_CANCELLED_BY_HOST','CONFIRMED_BY_HOST','REJECTED_BY_HOST','REPORTED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` bigint NOT NULL,
  `deposit_report_id` bigint NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_deposit_audit_log_report_id` (`deposit_report_id`),
  KEY `idx_deposit_audit_log_actor_id` (`actor_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
