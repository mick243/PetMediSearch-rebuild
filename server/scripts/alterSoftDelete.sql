-- 게시글·댓글 삭제를 실제 DELETE 대신 "지운 시각 표시" 로 바꿉니다.
--
-- 관리자가 남의 글을 지울 수 있게 되면서, 잘못 지웠을 때 되돌릴 방법이 필요해졌습니다.
-- deleted_at 이 NULL 이면 살아 있는 글, 값이 있으면 지워진 글입니다.
-- 되살리려면 그 값을 다시 NULL 로 바꾸면 됩니다.
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < alterSoftDelete.sql

-- 밀리초까지 남깁니다. 글을 지우면 그 글의 댓글도 같은 값으로 함께 표시하는데,
-- 초 단위로는 마침 같은 초에 따로 지워진 댓글과 구분되지 않습니다.
ALTER TABLE `posts`    ADD COLUMN `deleted_at` timestamp(3) NULL DEFAULT NULL;
ALTER TABLE `comments` ADD COLUMN `deleted_at` timestamp(3) NULL DEFAULT NULL;
