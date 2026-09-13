-- 회원 탈퇴.
--
-- 정책은 두 가지를 함께 씁니다.
--   ① 쓴 글·댓글·후기는 soft delete 로 함께 감춥니다 (되살릴 수 있습니다)
--   ③ users 행은 남기고 deleted_at 으로 계정만 비활성화합니다
--
-- 행을 지우지 않는 이유는 posts·comments·reviews 의 FK 가
-- ON DELETE SET NULL 이라, 지우면 글은 남고 작성자만 사라져 author JOIN 이
-- 깨지기 때문입니다. 행을 남기면 FK 가 성하고 나중에 되살릴 수도 있습니다.
--
-- reviews 에는 지금까지 soft delete 가 없어 삭제가 DELETE 였습니다. ①을 지키려면
-- 후기도 감출 수 있어야 해서 여기서 같이 세웁니다. 덕분에 후기 삭제도 글·댓글과
-- 같은 방식이 됩니다.
--
-- 인덱스도 다시 만듭니다. 후기 목록 쿼리에 deleted_at IS NULL 이 붙으면서
-- (facility_id, created_at) 만으로는 조건과 정렬을 한 번에 못 타기 때문입니다
-- (alterListIndexes.sql 과 같은 이유).
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < alterWithdraw.sql

-- 이 파일은 UTF-8 로 쓰여 있습니다. 아래 한 줄이 없으면 mysql 클라이언트가
-- latin1 로 읽어 한글이 조용히 깨집니다 ('통합' → 'í†µí•©').
-- 특히 docker-entrypoint-initdb.d 로 도는 초기화에는 charset 플래그를 붙일 자리가 없습니다.
SET NAMES utf8mb4;

ALTER TABLE `users`
  ADD COLUMN `deleted_at` timestamp(3) NULL DEFAULT NULL;

ALTER TABLE `reviews`
  ADD COLUMN `deleted_at` timestamp(3) NULL DEFAULT NULL,
  DROP KEY `idx_reviews_facility_recent`,
  DROP KEY `idx_reviews_user_recent`,
  ADD KEY `idx_reviews_facility_recent` (`facility_id`, `deleted_at`, `created_at`),
  ADD KEY `idx_reviews_user_recent` (`user_id`, `deleted_at`, `created_at`);
