-- 마이페이지의 "내가 쓴 댓글" 용 인덱스.
--
-- 새 목록 쿼리는 "user_id + 살아 있는 것 + created_at 내림차순 + LIMIT 20" 모양입니다.
-- comments 에는 FK 가 만든 (user_id) 단일 인덱스밖에 없어서, 그 사용자의 댓글을
-- 전부 읽은 뒤 정렬합니다 (EXPLAIN: key=comments_ibfk_2, Using filesort).
-- 댓글 6만 건 기준으로 댓글이 많은 사용자는 107행을 읽고 정렬해 20건을 냈습니다.
-- 정렬 순서를 인덱스에 담아 읽는 행을 페이지 크기만큼으로 줄입니다.
--
-- alterListIndexes.sql 의 idx_posts_user_recent 와 같은 모양입니다.
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < alterMypageCommentIndex.sql

ALTER TABLE `comments`
  ADD KEY `idx_comments_user_recent` (`user_id`, `deleted_at`, `created_at`);
