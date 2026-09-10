CREATE TABLE `users` (
   `user_id` int NOT NULL,
   `username` varchar(50) NOT NULL,
   PRIMARY KEY (`user_id`)
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
   `content` text NOT NULL,
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   PRIMARY KEY (`post_id`),
   KEY `category_id` (`category_id`),
   KEY `posts_ibfk_2` (`user_id`),
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
   PRIMARY KEY (`comment_id`),
   KEY `comments_ibfk_1` (`post_id`),
   KEY `comments_ibfk_2` (`user_id`),
   KEY `comments_ibfk_3` (`parent_comment_id`),
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
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (`review_id`),
   KEY `reviews_ibfk_1` (`user_id`),
   KEY `reviews_ibfk_2` (`facility_id`),
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
  `done` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`vaccination_id`),
  KEY `vacc_pet` (`pet_id`),
  CONSTRAINT `vacc_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`pet_id`) ON DELETE CASCADE
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
