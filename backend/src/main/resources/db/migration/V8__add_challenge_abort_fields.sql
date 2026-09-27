-- 1. challenges 테이블에 중단 관련 메타데이터 컬럼 추가
ALTER TABLE `challenges`
    ADD COLUMN `aborted_at` datetime(6) NULL DEFAULT NULL,
    ADD COLUMN `aborted_by` bigint NULL DEFAULT NULL,
    ADD COLUMN `abort_reason` text NULL DEFAULT NULL;
