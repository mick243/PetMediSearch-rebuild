-- 이미 나가 있는 토큰을 거둬들이기 위한 판번호.
--
-- 무엇이 문제였나:
--   JWT 는 한 번 발급하면 만료(하루) 전까지 서버가 되돌릴 방법이 없습니다.
--   비밀번호를 바꿔도 남의 기기에 남아 있던 로그인은 그대로 살아 있었습니다 —
--   비밀번호가 샜다고 생각해 바꾼 사람에게는 그게 바꾼 이유 그 자체인데,
--   정작 그 사람만 쫓아내지 못했습니다.
--
-- 어떻게 도나:
--   토큰에 이 값을 함께 실어 보내고(controller/auth.js 의 generateToken),
--   요청이 올 때마다 DB 의 값과 맞춰 봅니다(middleware/tokenVersion.js).
--   비밀번호를 바꾸거나 탈퇴하면 이 값을 1 올립니다. 그 순간 이전에 나간 토큰은
--   전부 어긋나 401 이 됩니다.
--
-- 왜 int 이고 기본값이 0 인가:
--   이 마이그레이션 전에 나간 토큰에는 판번호가 아예 없습니다. 없는 것을 0 으로
--   보고 컬럼 기본값도 0 으로 두면, 배포하는 순간 모두가 로그아웃되지 않습니다.
--   판번호는 계정마다 따로 올라가므로 넘칠 일이 없습니다(비밀번호를 21억 번
--   바꿔야 합니다).
--
-- 왜 인덱스를 따로 걸지 않나:
--   조회는 늘 user_id 로 합니다. 기본키로 찾는 한 행이라 덧붙일 인덱스가 없습니다.
--
-- 적용 (한 번만 — ADD COLUMN 은 이미 있으면 오류가 납니다):
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < scripts/alterTokenVersion.sql
--
-- 미리 백업:
--   docker exec petmedisearch-mysql mysqldump -uroot -p<암호> petmedisearch users > users.sql
--
-- 되돌리기:
--   ALTER TABLE `users` DROP COLUMN `token_version`;
--   (컬럼을 지우면 generateToken 이 싣는 v 를 아무도 보지 않게 되므로,
--    middleware/tokenVersion.js 를 app.js 에서 빼는 것도 함께 해야 합니다)

-- 이 파일은 UTF-8 로 쓰여 있습니다. 이 줄이 없으면 클라이언트가 latin1 로 읽어
-- 주석과 한글이 조용히 깨집니다.
SET NAMES utf8mb4;

ALTER TABLE `users`
  ADD COLUMN `token_version` int NOT NULL DEFAULT 0
  COMMENT '발급한 토큰의 판번호. 올리면 이전 토큰이 모두 무효가 됩니다'
  AFTER `role`;
