-- 이미 9시간 어긋나게 저장된 시각을 바로잡습니다. (스키마가 아니라 값을 고칩니다)
--
-- 무엇이 어긋났나:
--   DB 세션이 UTC 인 채로 돌던 동안, 시각이 두 갈래로 들어갔습니다.
--
--     CURRENT_TIMESTAMP 가 넣은 값   created_at · updated_at
--       → 순간은 맞습니다. UTC 로 읽혀서 화면에만 9시간 이르게 보였습니다.
--         세션 시간대를 +09:00 으로 바꾸면 그대로 맞게 보입니다. 고칠 것이 없습니다.
--
--     Node 가 new Date() 로 넣은 값   deleted_at · terms_agreed_at
--       → 순간 자체가 9시간 미래입니다. mysql2 가 KST 벽시계로 적어 보낸 문자열을
--         MySQL 이 UTC 로 읽었습니다. 실제로 재 보니 같은 순간에 쓴 두 값이
--         32,400초 벌어졌습니다. 이 파일이 고치는 것은 이쪽뿐입니다.
--
-- 언제 쓰나:
--   server/mysql.js 의 timezone 과 docker-compose 의 --default-time-zone 을 적용하기
--   전에 쓰인 행에만 해당합니다. 새로 만든 DB 라면 돌릴 필요가 없습니다.
--   아래 '확인' 쿼리로 대상이 있는지 먼저 보세요. 0 이면 그냥 넘어가면 됩니다.
--
-- 반드시 한 번만 돌리세요. 두 번 돌리면 18시간이 빠집니다.
--
-- 먼저 백업:
--   docker exec petmedisearch-mysql mysqldump -uroot -p<암호> petmedisearch users posts comments reviews > before-tz-fix.sql
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < scripts/fixTimestampSkew.sql
--
-- 되돌리기:
--   같은 UPDATE 에서 SUB 를 ADD 로 바꿔 한 번 돌리거나, 위 백업을 되돌립니다.

SET NAMES utf8mb4;

-- 확인 — 고칠 행이 몇 개인지. 전부 0 이면 아래 UPDATE 는 건너뛰어도 됩니다.
SELECT 'users.terms_agreed_at' AS `대상`, COUNT(terms_agreed_at) AS `행` FROM users
UNION ALL SELECT 'users.deleted_at',    COUNT(deleted_at) FROM users
UNION ALL SELECT 'posts.deleted_at',    COUNT(deleted_at) FROM posts
UNION ALL SELECT 'comments.deleted_at', COUNT(deleted_at) FROM comments
UNION ALL SELECT 'reviews.deleted_at',  COUNT(deleted_at) FROM reviews;

-- 9시간을 뺍니다.
-- TIMESTAMP 는 순간을 담고 있어, 세션 시간대가 무엇이든 결과는 똑같이 -9시간입니다.
UPDATE users    SET terms_agreed_at = terms_agreed_at - INTERVAL 9 HOUR WHERE terms_agreed_at IS NOT NULL;
UPDATE users    SET deleted_at      = deleted_at      - INTERVAL 9 HOUR WHERE deleted_at      IS NOT NULL;
UPDATE posts    SET deleted_at      = deleted_at      - INTERVAL 9 HOUR WHERE deleted_at      IS NOT NULL;
UPDATE comments SET deleted_at      = deleted_at      - INTERVAL 9 HOUR WHERE deleted_at      IS NOT NULL;
UPDATE reviews  SET deleted_at      = deleted_at      - INTERVAL 9 HOUR WHERE deleted_at      IS NOT NULL;
