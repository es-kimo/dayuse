-- 1. period_type 및 target_frequency 컬럼 추가 (기존 챌린지는 기본 DAILY, target_frequency NULL)
ALTER TABLE challenges
    ADD COLUMN period_type VARCHAR(20) NOT NULL DEFAULT 'DAILY',
    ADD COLUMN target_frequency INT NULL;
