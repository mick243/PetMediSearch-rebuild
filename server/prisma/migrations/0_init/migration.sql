-- 기준선 마이그레이션. 2026-09-28 까지의 스키마 전체입니다.
--
-- 그동안 스키마는 scripts/createTables.sql(신규 설치)과 scripts/alter*.sql(이미 있는 DB) 두 갈래로
-- 관리했습니다. 둘이 어긋나면 새로 깐 사람과 마이그레이션한 사람의 DB 가 달라지는데, 그것을
-- 막아 주는 장치가 없었습니다. 이제부터는 prisma/migrations 하나에 차례로 쌓고, CI 가 이 파일들과
-- schema.prisma 가 같은지(prisma migrate diff) 봅니다.
--
-- 새 DB:            prisma migrate deploy  (compose 초기화도 이것으로 바꿉니다 — 4단계)
-- 이미 돌고 있는 DB: 이 파일을 적용하지 않고 "이미 적용됨" 으로 표시만 합니다.
--                    prisma migrate resolve --applied 0_init
--                    운영에는 사람이 스키마가 같은지 확인한 뒤 돕니다.
--
-- 이 파일은 UTF-8 로 쓰여 있습니다. 아래 한 줄이 없으면 mysql 클라이언트가 latin1 로 읽어
-- enum('약국','병원') 과 분류 이름의 한글이 조용히 깨집니다.
SET NAMES utf8mb4;

-- 시설(동물병원/동물약국). 공공데이터를 적재합니다(scripts/syncData.ts).
-- lat/lng 는 원본 TM 좌표(x, y)를 적재 시점에 WGS84 로 변환해 담아 둔 컬럼입니다.
CREATE TABLE `medical_facilities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mgtno` VARCHAR(255) NOT NULL COMMENT '관리번호',
  `bplcnm` VARCHAR(255) NOT NULL COMMENT '사업장명',
  `sitewhladdr` TEXT COMMENT '지번주소',
  `rdnwhladdr` TEXT COMMENT '도로명주소',
  `sitetel` VARCHAR(20) DEFAULT NULL COMMENT '전화번호',
  `x` DECIMAL(18, 6) DEFAULT NULL COMMENT '원본 좌표 X (EPSG:5181)',
  `y` DECIMAL(18, 6) DEFAULT NULL COMMENT '원본 좌표 Y (EPSG:5181)',
  `lat` DECIMAL(10, 7) DEFAULT NULL COMMENT 'WGS84 위도 (적재 시 변환)',
  `lng` DECIMAL(10, 7) DEFAULT NULL COMMENT 'WGS84 경도 (적재 시 변환)',
  `apvpermymd` DATE DEFAULT NULL COMMENT '인허가일자',
  `dcbymd` DATE DEFAULT NULL COMMENT '폐업일자',
  `dtlstatenm` VARCHAR(50) DEFAULT NULL COMMENT '상세영업상태명(정상|폐업|말소|휴업)',
  `trdstatenm` VARCHAR(50) DEFAULT NULL COMMENT '영업상태명(영업/정상|폐업)',
  `type` ENUM('약국', '병원') NOT NULL,
  `lastmodts` TIMESTAMP NULL DEFAULT NULL COMMENT '최종수정시점',
  PRIMARY KEY (`id`),
  UNIQUE KEY `mgtno` (`mgtno`, `type`),
  -- 지도 화면 범위 조회용
  KEY `idx_latlng` (`lat`, `lng`),
  KEY `idx_state` (`dtlstatenm`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
   -- 발급한 토큰의 판번호. 비밀번호 변경·탈퇴 때 1 올려 이전 토큰을 전부 무효로 만듭니다(middleware/tokenVersion.ts).
   `token_version` int NOT NULL DEFAULT 0,
   `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
   -- 필수 약관에 동의한 시각. 화면의 체크만으로는 동의를 받았다는 것을 증명할 수 없습니다.
   `terms_agreed_at` timestamp(3) NULL DEFAULT NULL,
   -- 탈퇴는 행을 지우지 않고 이 값을 채웁니다. FK 5개가 ON DELETE SET NULL 이라 지우면 글은 남고 작성자만 사라집니다.
   `deleted_at` timestamp(3) NULL DEFAULT NULL,
   PRIMARY KEY (`user_id`),
   -- UNIQUE 는 NULL 을 서로 다른 값으로 보므로, 소셜 칸이 빈 일반 계정이 여럿이어도 됩니다.
   UNIQUE KEY `uq_users_social` (`social_id`, `social_type`),
   UNIQUE KEY `uq_users_email` (`email`)
 );

CREATE TABLE `categories` (
   `category_id` int NOT NULL AUTO_INCREMENT,
   `category_name` varchar(100) NOT NULL,
   PRIMARY KEY (`category_id`)
 );

-- 분류는 앱이 돌기 위한 기준 데이터라 스키마와 함께 둡니다(시드가 아닙니다).
-- 코드가 1 = 통합을 가정합니다(controller/category.ts 의 ALL_CATEGORY_ID). 번호를 명시합니다.
INSERT INTO `categories` (`category_id`, `category_name`) VALUES
  (1, '통합'), (2, '강아지'), (3, '고양이'), (4, '포유류'), (5, '양서류'),
  (6, '파충류'), (7, '조류'), (8, '어류'), (9, '기타');

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
   -- 목록용. "조건 + created_at 내림차순 + LIMIT" 모양이라 정렬 순서까지 인덱스에 담습니다(CLAUDE.md §3.2).
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
   `deleted_at` timestamp(3) NULL DEFAULT NULL,
   PRIMARY KEY (`review_id`),
   KEY `reviews_ibfk_1` (`user_id`),
   KEY `reviews_ibfk_2` (`facility_id`),
   -- 시설별 후기 목록 / 마이페이지의 내가 쓴 후기
   KEY `idx_reviews_facility_recent` (`facility_id`, `deleted_at`, `created_at`),
   KEY `idx_reviews_user_recent` (`user_id`, `deleted_at`, `created_at`),
   CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
   CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `medical_facilities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
   -- schema.prisma 는 CHECK 를 표현하지 못합니다. 이 파일에만 있습니다.
   CONSTRAINT `reviews_chk_1` CHECK ((`rating` between 1 and 5))
 );

-- 반려동물 프로필. 홈 화면의 주인공입니다.
CREATE TABLE `pets` (
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
CREATE TABLE `pet_vaccinations` (
  `vaccination_id` int NOT NULL AUTO_INCREMENT,
  `pet_id` int NOT NULL,
  `name` varchar(80) NOT NULL,
  `due_date` date NOT NULL,
  -- 예약 시각. 선택입니다 — 날짜만 아는 일정이 대부분이라 NULL 을 허용합니다.
  `due_time` time NULL DEFAULT NULL,
  `done` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`vaccination_id`),
  KEY `vacc_pet` (`pet_id`),
  -- 알림 배치는 "완료 안 했고 마감이 며칠 뒤" 로 고릅니다(scripts/sendReminders.ts). 없으면 매일 표를 통째로 읽습니다.
  KEY `idx_vacc_due` (`done`, `due_date`),
  CONSTRAINT `vacc_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`pet_id`) ON DELETE CASCADE
);

-- 웹 푸시 구독. 기기 하나에 한 행입니다.
CREATE TABLE `push_subscriptions` (
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

-- 접종·검진 알림을 이미 보냈는지. 배치가 하루에 두 번 돌아도 두 번째 INSERT 가 기본키에 걸립니다.
CREATE TABLE `vaccination_reminders` (
  `vaccination_id` int NOT NULL,
  -- 마감 며칠 전 알림인지. 3·2·1 을 각각 한 번씩만 보냅니다.
  `days_before` tinyint unsigned NOT NULL,
  `sent_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`vaccination_id`, `days_before`),
  CONSTRAINT `vacc_reminder_ibfk_1` FOREIGN KEY (`vaccination_id`)
    REFERENCES `pet_vaccinations` (`vaccination_id`) ON DELETE CASCADE
);

-- 즐겨찾기 병원·약국. 지도 정보창의 ★ 로 넣고 뺍니다.
CREATE TABLE `favorite_facilities` (
  `user_id` int NOT NULL,
  `facility_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `facility_id`),
  CONSTRAINT `fav_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fav_ibfk_2` FOREIGN KEY (`facility_id`) REFERENCES `medical_facilities` (`id`) ON DELETE CASCADE
);

-- 시설별 후기 AI 요약. 후기가 5건 이상 쌓인 시설에만 행이 있습니다.
-- review_count 가 실제 후기 수와 다르면 낡은 것이고, 조회가 스스로 다시 만듭니다.
CREATE TABLE `review_summaries` (
  `facility_id` int NOT NULL,
  `summary` text NOT NULL,
  `good` json NOT NULL,
  `caution` json NOT NULL,
  `review_count` int NOT NULL,
  `last_review_id` int NOT NULL,
  `provider` varchar(20) NOT NULL,
  `model` varchar(80) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`facility_id`),
  CONSTRAINT `review_summaries_ibfk_1` FOREIGN KEY (`facility_id`) REFERENCES `medical_facilities` (`id`) ON DELETE CASCADE
);

-- 댓글에 넣는 이모티콘. 관리자만 등록합니다. 그림은 여기 한 번만 두고 댓글에는 [emoticon:12] 표시만 남깁니다.
-- 이 표만 deleted_at 없이 진짜로 지웁니다 — 지운 뒤 id 를 앞으로 당기기 때문입니다.
CREATE TABLE `emoticons` (
  `emoticon_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  -- 올린 사람이 말한 형식이 아니라 바이트 앞머리를 보고 정한 값입니다.
  `mime` varchar(20) NOT NULL,
  -- 16MB 까지. 실제로는 서버가 512KB 로 자릅니다(controller/emoticon.ts).
  `data` mediumblob NOT NULL,
  -- 그림의 지문. 주소(/emoticons/:id/image?v=)에 실어 캐시가 번호를 헷갈리지 않게 합니다.
  `content_hash` char(16) GENERATED ALWAYS AS (SUBSTRING(SHA2(`data`, 256), 1, 16)) STORED NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`emoticon_id`),
  CONSTRAINT `emoticons_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
);
