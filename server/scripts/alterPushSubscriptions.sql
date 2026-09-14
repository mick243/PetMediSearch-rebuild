-- 웹 푸시 구독. 접종·검진 알림을 보낼 주소가 여기 있습니다.
--
-- 무엇이 들어가나:
--   브라우저가 푸시 서비스(안드로이드·크롬이면 Google FCM, 사파리면 Apple)에서
--   받아 온 주소와 암호화 키입니다. 사람이 읽을 수 있는 개인정보는 아니지만
--   "이 사람의 이 기기" 를 가리키므로 개인정보로 다룹니다.
--   (개인정보처리방침 1·2·3장에 함께 적었습니다)
--
-- 왜 endpoint 에 UNIQUE 를 거나:
--   같은 기기가 구독을 다시 만들면 같은 endpoint 가 돌아옵니다. 그때마다 행을
--   더하면 한 기기에 알림이 여러 번 갑니다. UNIQUE 로 막고 upsert 합니다.
--   먼저 SELECT 로 확인하는 방식은 두 탭이 동시에 구독하면 사이로 빠져나갑니다.
--
-- 왜 사용자당 여러 행인가:
--   한 사람이 휴대폰·노트북에서 각각 구독할 수 있습니다. 기기마다 한 행입니다.
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < scripts/alterPushSubscriptions.sql
--
-- 되돌리기:
--   DROP TABLE `push_subscriptions`;

-- 이 파일은 UTF-8 로 쓰여 있습니다. 이 줄이 없으면 클라이언트가 latin1 로 읽어
-- 주석과 한글이 조용히 깨집니다.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `subscription_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  -- 푸시 서비스가 준 주소. 길이는 규격에 상한이 없지만 실제로는 200자 안팎입니다.
  -- 512자면 넉넉하고, utf8mb4 로도 인덱스 상한(3072바이트) 안에 듭니다.
  `endpoint` varchar(512) NOT NULL,
  -- 본문을 암호화할 때 쓰는 값. 브라우저가 준 그대로 보관합니다.
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 마지막으로 이 구독에 실제로 보낸 때. 오래 놀고 있는 구독을 골라내는 데 씁니다.
  `last_sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`subscription_id`),
  UNIQUE KEY `uq_push_endpoint` (`endpoint`),
  KEY `push_user` (`user_id`),
  -- 탈퇴하면 구독도 함께 사라져야 합니다. 방침의 파기 범위와 같은 뜻입니다.
  CONSTRAINT `push_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
);
