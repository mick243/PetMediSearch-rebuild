-- 댓글에 넣는 이모티콘(스티커) 표. 관리자만 등록합니다.
--
-- 왜 표를 따로 두는가
--   그림을 댓글 content 에 data URL 로 박으면, 같은 이모티콘을 쓴 댓글마다 같은
--   수십 KB 가 통째로 복사됩니다. 댓글 5건짜리 한 쪽이 그것만으로 수백 KB 가 되고,
--   마이페이지의 '내가 쓴 댓글' 목록에도 전부 딸려옵니다. 후기 사진에서 이미 같은
--   문제를 겪었습니다 (429KB -> 725B).
--   그림은 여기 한 번만 두고, 댓글에는 [emoticon:12] 같은 짧은 표시만 남깁니다.
--   실제 그림은 GET /emoticons/:id/image 로 따로 받아 가고 브라우저가 캐시합니다.
--
-- 왜 base64 가 아니라 blob 인가
--   그대로 이미지 응답으로 흘려보내려고 원본 바이트를 담습니다. base64 로 담으면
--   저장 크기가 33% 늘고 요청마다 디코딩을 한 번씩 더 해야 합니다.
--   (pets.photo·reviews.images 가 data URL 인 것은 파일 서버가 없어서 진 빚입니다.
--    새로 만드는 표까지 같은 모양으로 둘 이유는 없습니다.)
--
-- 왜 deleted_at 이 없는가
--   이 표만 다른 표와 다르게 진짜로 지웁니다. 지운 뒤 id 를 앞으로 당겨 빈자리를
--   메우기 때문입니다 (controller/emoticon.js 의 deleteEmoticon). 지운 행을 남겨
--   두면 그 행이 id 를 계속 차지해서 당길 수가 없습니다.
--   대신 지울 때 그 이모티콘을 쓴 댓글의 표시를 [emoticon:0] 으로 바꿔 두어,
--   옛 댓글이 옆 이모티콘을 잘못 가리키지 않게 합니다.
--   되돌릴 수 없으므로 화면에서 한 번 물어봅니다.
--
-- 적용
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < server/scripts/alterEmoticons.sql
--
-- 되돌리기 (새로 만드는 표라 백업할 기존 데이터가 없습니다)
--   DROP TABLE `emoticons`;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `emoticons` (
  -- 지울 때마다 뒤엣것을 한 칸씩 당겨서 1,2,3... 으로 이어 둡니다.
  `emoticon_id` int NOT NULL AUTO_INCREMENT,
  -- 피커의 이름표이자, 댓글에서 화면 낭독기가 읽어 주는 대체 텍스트입니다.
  `name` varchar(30) NOT NULL,
  -- 올린 사람이 말한 형식이 아니라 바이트 앞머리를 보고 정한 값입니다.
  `mime` varchar(20) NOT NULL,
  -- 16MB 까지. 실제로는 서버가 512KB 로 자릅니다 (controller/emoticon.js).
  `data` mediumblob NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  -- 목록은 "전부 다"라 기본키만으로 정렬까지 끝납니다. 따로 인덱스를 두지 않습니다.
  PRIMARY KEY (`emoticon_id`),
  CONSTRAINT `emoticons_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
);
