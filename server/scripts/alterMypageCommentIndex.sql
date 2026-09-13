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

-- 이 파일은 UTF-8 로 쓰여 있습니다. 아래 한 줄이 없으면 mysql 클라이언트가
-- latin1 로 읽어 한글이 조용히 깨집니다 ('통합' → 'í†µí•©').
-- 특히 docker-entrypoint-initdb.d 로 도는 초기화에는 charset 플래그를 붙일 자리가 없습니다.
SET NAMES utf8mb4;

ALTER TABLE `comments`
  ADD KEY `idx_comments_user_recent` (`user_id`, `deleted_at`, `created_at`);
