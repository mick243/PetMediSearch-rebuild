-- 접종·검진 알림을 이미 보냈는지 기록하는 표와, 그 대상을 고르는 인덱스.
--
-- 왜 표가 필요한가:
--   알림은 하루 한 번 도는 배치입니다. 배포·재시작·손으로 다시 실행하면 같은 날
--   두 번 돌고, 같은 사람에게 같은 알림이 또 갑니다. (vaccination_id, days_before)
--   를 기본키로 잡아 두 번째 INSERT 가 DB 에서 막히게 합니다.
--   먼저 SELECT 로 확인하는 방식은 두 작업이 겹쳐 돌 때 그 사이로 빠져나갑니다.
--
-- 왜 인덱스가 필요한가:
--   pet_vaccinations 에는 지금 pet_id 키뿐입니다. 알림 배치는 pet_id 가 아니라
--   "완료하지 않았고 마감이 며칠 뒤인 것" 으로 고르므로 표를 통째로 읽습니다.
--   가입자 1만·아이 2마리·아이당 5건이면 대략 10만 행입니다.
--   scripts/sendReminders.js 가 due_date 를 함수로 감싸지 않고 날짜 목록으로
--   비교하는 것도 이 인덱스를 쓰기 위해서입니다.
--
-- 적용 (한 번만 — ADD KEY 는 이미 있으면 오류가 납니다):
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < scripts/alterVaccinationReminders.sql
--
-- 미리 백업:
--   docker exec petmedisearch-mysql mysqldump -uroot -p<암호> petmedisearch pet_vaccinations > pet_vaccinations.sql
--
-- 되돌리기:
--   DROP TABLE `vaccination_reminders`;
--   ALTER TABLE `pet_vaccinations` DROP KEY `idx_vacc_due`;

-- 이 파일은 UTF-8 로 쓰여 있습니다. 이 줄이 없으면 클라이언트가 latin1 로 읽어
-- 주석과 한글이 조용히 깨집니다.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `vaccination_reminders` (
  `vaccination_id` int NOT NULL,
  -- 마감 며칠 전 알림인지. 3·2·1 을 각각 한 번씩만 보냅니다.
  `days_before` tinyint unsigned NOT NULL,
  `sent_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`vaccination_id`, `days_before`),
  -- 일정이 지워지면 기록도 같이 지웁니다. pets → pet_vaccinations 와 같은 방식입니다.
  CONSTRAINT `vacc_reminder_ibfk_1` FOREIGN KEY (`vaccination_id`)
    REFERENCES `pet_vaccinations` (`vaccination_id`) ON DELETE CASCADE
);

ALTER TABLE `pet_vaccinations`
  ADD KEY `idx_vacc_due` (`done`, `due_date`);
