SET NAMES utf8mb4;

-- 시설별 후기 AI 요약. 후기가 5건 이상 쌓인 시설에만 행이 있습니다.
--
-- 왜 표에 두는가
--   시설 후기 목록(GET /reviews/facility/:id)은 이 앱에서 가장 자주 읽히는 요청 중
--   하나입니다. 읽을 때마다 모델을 부르면 조회마다 수 초와 과금이 붙습니다.
--   후기가 등록·수정·삭제될 때만 다시 만들어 여기 두고, 목록은 이 행을 같이 실어
--   보냅니다. 모델 호출 수 = 후기가 쓰인 횟수가 되어 조회 수와 무관해집니다.
--
-- 왜 stale 컬럼이 없는가
--   review_count 가 그 역할을 합니다. 목록을 읽을 때 실제 후기 수와 다르면 뒤에서
--   다시 만듭니다(controller/reviewSummary.js). 요약 중에 프로세스가 죽어도 다음
--   조회가 스스로 메우므로 따로 표시를 남길 필요가 없습니다.
--
-- 왜 5건 미만이면 행을 지우는가
--   한두 사람의 글을 "전체 인상"으로 내보내면 그 사람의 의견이 시설의 평가가 됩니다.
--   삭제로 5건 아래로 내려가면 행도 지웁니다.
--
-- good / caution 은 문자열 배열(json)입니다. 항목은 3개까지, 각 80자까지 — 서버가 자릅니다.
--
-- 적용
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < server/scripts/alterReviewSummaries.sql
--
-- 되돌리기 (새로 만드는 표라 백업할 기존 데이터가 없습니다. 지워도 후기는 그대로입니다)
--   DROP TABLE `review_summaries`;

CREATE TABLE IF NOT EXISTS `review_summaries` (
  `facility_id` int NOT NULL,
  `summary` text NOT NULL,
  `good` json NOT NULL,
  `caution` json NOT NULL,
  -- 만들 때 살아 있던 후기 수. 지금 수와 다르면 낡은 것입니다.
  `review_count` int NOT NULL,
  -- 만들 때 본 가장 최근 후기. 어느 후기까지 반영됐는지 알아보는 용도입니다.
  `last_review_id` int NOT NULL,
  -- 어느 제공자·모델이 만든 글인지. 제공자를 바꾼 뒤 옛 글을 골라내려면 필요합니다.
  `provider` varchar(20) NOT NULL,
  `model` varchar(80) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`facility_id`),
  CONSTRAINT `review_summaries_ibfk_1` FOREIGN KEY (`facility_id`) REFERENCES `medical_facilities` (`id`) ON DELETE CASCADE
);
