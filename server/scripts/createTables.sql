-- 신규 설치용 스키마. 이미 돌고 있는 DB 에는 scripts/alter*.sql 을 쓰세요.
-- 이 파일에는 마이그레이션이 더한 컬럼과 인덱스가 모두 반영돼 있어야 합니다.
--
-- 적용 (medical_facilities 가 먼저 있어야 합니다 — reviews 와 favorite_facilities 가 참조합니다):
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < createFacilitiesTable.sql
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < createTables.sql
--
-- --default-character-set=utf8mb4 를 빼면 안 됩니다. 클라이언트가 이 파일을 latin1 로
-- 읽어서 한글이 전부 깨집니다 — 분류 이름이 'ê°•ì•„ì§€' 가 되고 enum('약국','병원') 도
-- 못 쓰는 값이 됩니다.

-- 이 파일은 UTF-8 로 쓰여 있습니다. 아래 한 줄이 없으면 mysql 클라이언트가
-- latin1 로 읽어 한글이 조용히 깨집니다 ('통합' → 'í†µí•©').
-- 특히 docker-entrypoint-initdb.d 로 도는 초기화에는 charset 플래그를 붙일 자리가 없습니다.
SET NAMES utf8mb4;

CREATE TABLE `users` (
   `user_id` int NOT NULL AUTO_INCREMENT,
   -- 화면에 보이는 이름입니다. 소셜은 제공자가 준 이름, 일반 가입은 입력한 이름을 씁니다.
   `username` varchar(50) NOT NULL,
   -- 소셜 로그인 식별자. 일반 가입 계정에서는 둘 다 NULL 입니다.
   `social_id` varchar(100) NULL,
   `social_type` varchar(20) NULL,
   -- 일반 회원가입으로 받는 정보. 소셜 계정에서는 NULL 입니다.
   `email` varchar(255) NULL,
   `password` varchar(255) NULL,
   `phone` varchar(20) NULL,
   `address` varchar(255) NULL,
   `role` varchar(20) NOT NULL DEFAULT 'user',
   -- 발급한 토큰의 판번호. 비밀번호 변경·탈퇴 때 1 올려 이전 토큰을 전부 무효로
   -- 만듭니다 (scripts/alterTokenVersion.sql, middleware/tokenVersion.js).
   `token_version` int NOT NULL DEFAULT 0,
   `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
   -- 필수 약관에 동의한 시각. 화면의 체크만으로는 동의를 받았다는 것을 증명할 수 없습니다.
   `terms_agreed_at` timestamp(3) NULL DEFAULT NULL,
   -- 탈퇴는 행을 지우지 않고 이 값을 채웁니다. FK 5개가 ON DELETE SET NULL 이라
   -- 지우면 글은 남고 작성자만 사라집니다.
   `deleted_at` timestamp(3) NULL DEFAULT NULL,
   PRIMARY KEY (`user_id`),
   -- UNIQUE 는 NULL 을 서로 다른 값으로 보므로, 소셜 칸이 빈 일반 계정이 여럿이어도 됩니다.
   UNIQUE KEY `uq_users_social` (`social_id`, `social_type`),
   UNIQUE KEY `uq_users_email` (`email`)
 );

INSERT INTO `users` (`user_id`, `username`) VALUES (1, '신짱구');
INSERT INTO `users` (`user_id`, `username`) VALUES (2, '신짱아');
INSERT INTO `users` (`user_id`, `username`) VALUES (3, '훈이');
INSERT INTO `users` (`user_id`, `username`) VALUES (4, '맹구');
INSERT INTO `users` (`user_id`, `username`) VALUES (5, '철수');
INSERT INTO `users` (`user_id`, `username`) VALUES (6, '유리');


 CREATE TABLE `categories` (
   `category_id` int NOT NULL AUTO_INCREMENT,
   `category_name` varchar(100) NOT NULL,
   PRIMARY KEY (`category_id`)
 );

INSERT INTO `categories` (`category_name`) VALUES ('통합');
INSERT INTO `categories` (`category_name`) VALUES ('강아지');
INSERT INTO `categories` (`category_name`) VALUES ('고양이');
INSERT INTO `categories` (`category_name`) VALUES ('포유류');
INSERT INTO `categories` (`category_name`) VALUES ('양서류');
INSERT INTO `categories` (`category_name`) VALUES ('파충류');
INSERT INTO `categories` (`category_name`) VALUES ('조류');
INSERT INTO `categories` (`category_name`) VALUES ('어류');
INSERT INTO `categories` (`category_name`) VALUES ('기타');

 CREATE TABLE `posts` (
   `post_id` int NOT NULL AUTO_INCREMENT,
   `category_id` int DEFAULT NULL,
   `user_id` int DEFAULT NULL,
   `title` varchar(255) NOT NULL,
   -- 본문 에디터가 사진을 data URL 로 박아 넣습니다. text(64KB)로는 사진 한 장도 못 담습니다.
   `content` mediumtext NOT NULL,
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   -- 삭제는 실제로 지우지 않고 이 값을 채웁니다. NULL 이면 살아 있는 글입니다.
   `deleted_at` timestamp(3) NULL DEFAULT NULL,
   PRIMARY KEY (`post_id`),
   KEY `category_id` (`category_id`),
   KEY `posts_ibfk_2` (`user_id`),
   -- 목록용. "조건 + created_at 내림차순 + LIMIT" 모양이라 정렬 순서까지 인덱스에 담습니다.
   -- 자세한 이유는 scripts/alterListIndexes.sql 에 적어 뒀습니다.
   KEY `idx_posts_live_recent` (`deleted_at`, `created_at`),
   KEY `idx_posts_category_recent` (`category_id`, `deleted_at`, `created_at`),
   KEY `idx_posts_user_recent` (`user_id`, `deleted_at`, `created_at`),
   CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
   CONSTRAINT `posts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
 );


CREATE TABLE `comments` (
   `comment_id` int NOT NULL AUTO_INCREMENT,
   `post_id` int DEFAULT NULL,
   `user_id` int DEFAULT NULL,
   `content` text NOT NULL,
   `parent_comment_id` int DEFAULT NULL,
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   -- 삭제는 실제로 지우지 않고 이 값을 채웁니다. NULL 이면 살아 있는 글입니다.
   `deleted_at` timestamp(3) NULL DEFAULT NULL,
   PRIMARY KEY (`comment_id`),
   KEY `comments_ibfk_1` (`post_id`),
   KEY `comments_ibfk_2` (`user_id`),
   KEY `comments_ibfk_3` (`parent_comment_id`),
   -- 글의 댓글 목록 / 마이페이지의 내가 쓴 댓글
   KEY `idx_comments_post_recent` (`post_id`, `deleted_at`, `created_at`),
   KEY `idx_comments_user_recent` (`user_id`, `deleted_at`, `created_at`),
   CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
   CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
   CONSTRAINT `comments_ibfk_3` FOREIGN KEY (`parent_comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE SET NULL
 );


 CREATE TABLE `reviews` (
   `review_id` int NOT NULL AUTO_INCREMENT,
   `user_id` int DEFAULT NULL,
   `facility_id` int DEFAULT NULL,
   `rating` tinyint DEFAULT NULL,
   `review_content` text,
   `images` json DEFAULT NULL COMMENT '축소된 JPEG data URL 목록',
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   -- 삭제는 실제로 지우지 않고 이 값을 채웁니다. NULL 이면 살아 있는 글입니다.
   `deleted_at` timestamp(3) NULL DEFAULT NULL,
   PRIMARY KEY (`review_id`),
   KEY `reviews_ibfk_1` (`user_id`),
   KEY `reviews_ibfk_2` (`facility_id`),
   -- 시설별 후기 목록 / 마이페이지의 내가 쓴 후기
   KEY `idx_reviews_facility_recent` (`facility_id`, `deleted_at`, `created_at`),
   KEY `idx_reviews_user_recent` (`user_id`, `deleted_at`, `created_at`),
   CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
   CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `medical_facilities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
   CONSTRAINT `reviews_chk_1` CHECK ((`rating` between 1 and 5))
 );

-- 반려동물 프로필. 홈 화면(H안)의 주인공입니다.
CREATE TABLE IF NOT EXISTS `pets` (
  `pet_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `category_id` int DEFAULT NULL COMMENT '분류(강아지·고양이·…). 게시판 카테고리와 같은 표',
  `breed` varchar(50) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `photo` mediumtext DEFAULT NULL COMMENT '축소된 JPEG data URL',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pet_id`),
  KEY `pets_user` (`user_id`),
  CONSTRAINT `pets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `pets_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL
);

-- 접종·검진 일정. 홈의 D-day 타일이 여기서 나옵니다.
CREATE TABLE IF NOT EXISTS `pet_vaccinations` (
  `vaccination_id` int NOT NULL AUTO_INCREMENT,
  `pet_id` int NOT NULL,
  `name` varchar(80) NOT NULL,
  `due_date` date NOT NULL,
  -- 예약 시각. 선택입니다 — 날짜만 아는 일정이 대부분이라 NULL 을 허용합니다.
  -- 알림 배치와 D-day 는 날짜만 보므로 이 값은 화면 표시에만 씁니다.
  `due_time` time NULL DEFAULT NULL,
  `done` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`vaccination_id`),
  KEY `vacc_pet` (`pet_id`),
  -- 알림 배치는 pet_id 가 아니라 "완료 안 했고 마감이 며칠 뒤" 로 고릅니다.
  -- 이 인덱스가 없으면 매일 표를 통째로 읽습니다. (scripts/sendReminders.js)
  KEY `idx_vacc_due` (`done`, `due_date`),
  CONSTRAINT `vacc_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`pet_id`) ON DELETE CASCADE
);

-- 웹 푸시 구독. 기기 하나에 한 행입니다. 자세한 사정은 scripts/alterPushSubscriptions.sql 에.
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `subscription_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `endpoint` varchar(512) NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`subscription_id`),
  -- 같은 기기가 다시 구독하면 같은 endpoint 가 옵니다. 행이 늘면 알림이 여러 번 갑니다.
  UNIQUE KEY `uq_push_endpoint` (`endpoint`),
  KEY `push_user` (`user_id`),
  CONSTRAINT `push_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
);

-- 접종·검진 알림을 이미 보냈는지. 같은 알림이 두 번 가지 않게 DB 가 막아 줍니다.
-- 배치가 하루에 두 번 돌아도(배포·재시작·수동 실행) 두 번째 INSERT 가 기본키에 걸립니다.
CREATE TABLE IF NOT EXISTS `vaccination_reminders` (
  `vaccination_id` int NOT NULL,
  -- 마감 며칠 전 알림인지. 3·2·1 을 각각 한 번씩만 보냅니다.
  `days_before` tinyint unsigned NOT NULL,
  `sent_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`vaccination_id`, `days_before`),
  CONSTRAINT `vacc_reminder_ibfk_1` FOREIGN KEY (`vaccination_id`)
    REFERENCES `pet_vaccinations` (`vaccination_id`) ON DELETE CASCADE
);

-- 단골 병원·약국. 지도 정보창의 ★ 로 넣고 뺍니다.
CREATE TABLE IF NOT EXISTS `favorite_facilities` (
  `user_id` int NOT NULL,
  `facility_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `facility_id`),
  CONSTRAINT `fav_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fav_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `medical_facilities` (`id`) ON DELETE CASCADE
);

-- 댓글에 넣는 이모티콘. 관리자만 등록합니다.
-- 그림은 여기 한 번만 두고 댓글에는 [emoticon:12] 표시만 남깁니다.
-- 자세한 이유는 scripts/alterEmoticons.sql 주석에 적어 두었습니다.
CREATE TABLE IF NOT EXISTS `emoticons` (
  `emoticon_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  -- 올린 사람이 말한 형식이 아니라 바이트 앞머리를 보고 정한 값입니다.
  `mime` varchar(20) NOT NULL,
  -- 16MB 까지. 실제로는 서버가 512KB 로 자릅니다 (controller/emoticon.js).
  `data` mediumblob NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  -- 지워도 행은 남깁니다. 옛 댓글이 가리키던 id 라 조회에서만 빠집니다.
  `deleted_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`emoticon_id`),
  KEY `idx_emoticons_live` (`deleted_at`, `emoticon_id`),
  CONSTRAINT `emoticons_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
);
