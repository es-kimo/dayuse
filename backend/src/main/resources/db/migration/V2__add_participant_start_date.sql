-- 1. start_date 컬럼을 NULL 허용으로 추가 (기존 데이터 존재 시에도 안전하게 추가)
ALTER TABLE challenge_participants ADD COLUMN start_date DATE NULL;

-- 2. 기존 참여자의 시작일을 해당 챌린지 시작일(c.start_date)로 백필
UPDATE challenge_participants cp
JOIN challenges c ON cp.challenge_id = c.id
SET cp.start_date = c.start_date;

-- 3. 기존 데이터가 모두 채워진 후 NOT NULL 제약조건 적용
ALTER TABLE challenge_participants MODIFY COLUMN start_date DATE NOT NULL;
