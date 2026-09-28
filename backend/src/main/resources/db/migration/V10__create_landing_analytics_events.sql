CREATE TABLE IF NOT EXISTS `landing_analytics_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `session_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `placement` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utm_source` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `utm_medium` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `utm_campaign` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `utm_content` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referrer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_landing_analytics_session` (`session_id`),
  KEY `idx_landing_analytics_event` (`event_name`),
  KEY `idx_landing_analytics_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
