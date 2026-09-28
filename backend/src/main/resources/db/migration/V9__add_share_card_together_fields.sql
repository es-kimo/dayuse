ALTER TABLE `share_cards`
  ADD COLUMN `execution_type` enum('INDIVIDUAL','TOGETHER') NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN `actual_verifier_nickname` varchar(50) DEFAULT NULL;
