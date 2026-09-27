-- 1. execution_type 컬럼 추가 (기존 챌린지는 기본 INDIVIDUAL)
ALTER TABLE `challenges`
    ADD COLUMN `execution_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INDIVIDUAL';
