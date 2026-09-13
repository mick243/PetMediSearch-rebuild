-- 목록 조회용 인덱스.
--
-- 목록을 페이지로 끊으면서 쿼리가 전부 "조건 + created_at 내림차순 + LIMIT" 모양이
-- 됐습니다. 이 모양은 인덱스가 없으면 표를 통째로 읽고 정렬합니다
-- (EXPLAIN: type=ALL, Using filesort). 글 2만 건 기준으로 매 요청 18,000행을
-- 읽고 있었습니다. 정렬 순서까지 인덱스에 담아 읽는 행을 페이지 크기만큼으로 줄입니다.
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < alterListIndexes.sql

-- 이 파일은 UTF-8 로 쓰여 있습니다. 아래 한 줄이 없으면 mysql 클라이언트가
-- latin1 로 읽어 한글이 조용히 깨집니다 ('통합' → 'í†µí•©').
-- 특히 docker-entrypoint-initdb.d 로 도는 초기화에는 charset 플래그를 붙일 자리가 없습니다.
SET NAMES utf8mb4;

ALTER TABLE `posts`
  -- 통합(전체 글) 목록
  ADD KEY `idx_posts_live_recent` (`deleted_at`, `created_at`),
  -- 분류별 목록
  ADD KEY `idx_posts_category_recent` (`category_id`, `deleted_at`, `created_at`),
  -- 마이페이지의 내가 쓴 글
  ADD KEY `idx_posts_user_recent` (`user_id`, `deleted_at`, `created_at`);

ALTER TABLE `comments`
  ADD KEY `idx_comments_post_recent` (`post_id`, `deleted_at`, `created_at`);

ALTER TABLE `reviews`
  ADD KEY `idx_reviews_facility_recent` (`facility_id`, `created_at`),
  ADD KEY `idx_reviews_user_recent` (`user_id`, `created_at`);
