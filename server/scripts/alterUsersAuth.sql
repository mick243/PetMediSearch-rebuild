-- users 테이블에 소셜 식별자와 일반 회원가입 정보를 더합니다.
--
-- 기존 스키마는 user_id·username 둘뿐이어서 auth.js 가 쓰는 social_id·social_type 이
-- 없었고, 그래서 소셜 로그인이 "Unknown column 'social_id'" 로 항상 실패했습니다.
-- 이미 쌓인 유저·글을 살려야 하므로 테이블을 다시 만들지 않고 컬럼만 붙입니다.
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < alterUsersAuth.sql

-- posts·comments·reviews·pets·favorite_facilities 다섯 테이블이 users.user_id 를
-- 참조하고 있어서, 그대로는 이 컬럼에 손댈 수 없습니다(ERROR 1833).
-- int 그대로 두고 AUTO_INCREMENT 속성만 얹는 것이라 잠깐 꺼도 데이터는 안전합니다.
SET foreign_key_checks = 0;

-- 소셜이든 일반이든 가입하면 새 행이 생기므로 번호를 자동으로 매깁니다.
ALTER TABLE `users` MODIFY `user_id` int NOT NULL AUTO_INCREMENT;

SET foreign_key_checks = 1;

ALTER TABLE `users`
  -- 소셜 로그인 식별자. 일반 가입 계정에서는 둘 다 NULL 입니다.
  ADD COLUMN `social_id`   varchar(100) NULL AFTER `username`,
  ADD COLUMN `social_type` varchar(20)  NULL AFTER `social_id`,

  -- 일반 회원가입으로 받는 정보. 소셜 계정에서는 NULL 입니다.
  ADD COLUMN `email`    varchar(255) NULL AFTER `social_type`,
  ADD COLUMN `password` varchar(255) NULL AFTER `email`,
  ADD COLUMN `phone`    varchar(20)  NULL AFTER `password`,
  ADD COLUMN `address`  varchar(255) NULL AFTER `phone`,

  ADD COLUMN `role`       varchar(20) NOT NULL DEFAULT 'user' AFTER `address`,
  ADD COLUMN `created_at` timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `role`,

  -- MySQL 의 UNIQUE 는 NULL 을 서로 다른 값으로 보기 때문에,
  -- 소셜 칸이 비어 있는 일반 계정이 여럿 있어도 걸리지 않습니다.
  ADD UNIQUE KEY `uq_users_social` (`social_id`, `social_type`),
  ADD UNIQUE KEY `uq_users_email` (`email`);
