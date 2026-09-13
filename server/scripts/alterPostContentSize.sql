-- 글 본문 칸을 넓힙니다.
--
-- posts.content 는 text(65,535바이트)였는데, 본문 에디터(ReactQuill)가 사진을
-- 축소된 JPEG data URL 로 본문에 박아 넣습니다. 900px 사진 한 장이 보통
-- 100~250KB 라서 사진을 넣은 글은 예외 없이 저장에 실패했습니다.
--
--   ERROR 1406 (22001): Data too long for column 'content' at row 1
--
-- sql_mode 에 STRICT_TRANS_TABLES 가 켜져 있어 잘려 들어가지도 않고 그대로 터집니다.
-- 화면에는 "서버 에러 발생" 만 보이고 서버 로그에는 쿼리 전문이 통째로 찍혔습니다.
--
-- mediumtext 는 16MB 까지 담습니다. 요청 본문 상한이 3mb(server/app.js)라
-- 실제로 들어올 수 있는 최대치보다 넉넉합니다.
--
-- 댓글·후기 본문은 평문이라 넓히지 않고 입력 길이를 제한하는 쪽으로 두었습니다
-- (server/controller/validate.js).
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < alterPostContentSize.sql

-- 이 파일은 UTF-8 로 쓰여 있습니다. 아래 한 줄이 없으면 mysql 클라이언트가
-- latin1 로 읽어 한글이 조용히 깨집니다 ('통합' → 'í†µí•©').
-- 특히 docker-entrypoint-initdb.d 로 도는 초기화에는 charset 플래그를 붙일 자리가 없습니다.
SET NAMES utf8mb4;

ALTER TABLE `posts` MODIFY `content` mediumtext NOT NULL;
