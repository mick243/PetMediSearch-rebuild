-- 접종·검진 일정에 시각을 더합니다.
--
-- 왜 컬럼을 따로 두나 (due_date 를 datetime 으로 바꾸지 않고):
--   시각은 선택입니다. "9월 16일 예방접종" 처럼 날짜만 아는 일정이 대부분이고,
--   병원 예약을 잡은 것만 "오후 3시" 가 붙습니다. due_date 를 datetime 으로 바꾸면
--   시각을 모르는 일정에도 00:00 이 생겨, 화면이 "자정 예정" 처럼 읽히게 됩니다.
--   NULL 을 허용하는 별도 컬럼이면 "모름" 과 "자정" 을 가를 수 있습니다.
--
--   기존 값을 건드리지 않는 것도 큽니다. 알림 배치와 D-day 는 날짜만 보므로
--   (scripts/sendReminders.js 의 due_date IN (...)), 이 마이그레이션 뒤에도
--   쿼리와 (done, due_date) 인덱스를 그대로 씁니다.
--
-- 적용 (한 번만 — ADD COLUMN 은 이미 있으면 오류가 납니다):
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < scripts/alterVaccinationTime.sql
--
-- 미리 백업:
--   docker exec petmedisearch-mysql mysqldump -uroot -p<암호> petmedisearch pet_vaccinations > pet_vaccinations.sql
--
-- 되돌리기:
--   ALTER TABLE `pet_vaccinations` DROP COLUMN `due_time`;

-- 이 파일은 UTF-8 로 쓰여 있습니다. 이 줄이 없으면 클라이언트가 latin1 로 읽어
-- 주석과 한글이 조용히 깨집니다.
SET NAMES utf8mb4;

ALTER TABLE `pet_vaccinations`
  ADD COLUMN `due_time` time NULL DEFAULT NULL COMMENT '예약 시각. 모르면 NULL 입니다' AFTER `due_date`;
