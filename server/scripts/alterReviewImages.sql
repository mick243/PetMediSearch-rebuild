-- 후기에 사진을 여러 장 붙일 수 있게 합니다.
--
-- 반려동물 사진(pets.photo)과 같이 브라우저에서 줄인 JPEG 를 data URL 로 넣습니다.
-- 파일 서버가 따로 없어서, 업로드 경로를 새로 만드는 대신 이미 쓰는 방식을 따릅니다.
-- 여러 장이므로 JSON 배열로 담습니다. 후기는 항상 통째로 읽어가서 따로 표를 두고
-- 조인할 이유가 없습니다.
--
-- 한 장만 담던 image 컬럼이 있으면 그 값을 한 칸짜리 배열로 옮기고 지웁니다.
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < alterReviewImages.sql

ALTER TABLE `reviews`
  ADD COLUMN `images` json NULL COMMENT '축소된 JPEG data URL 목록' AFTER `review_content`;

-- image 컬럼이 없던 설치에서는 아래 두 줄을 건너뛰세요.
UPDATE `reviews` SET `images` = JSON_ARRAY(`image`) WHERE `image` IS NOT NULL;
ALTER TABLE `reviews` DROP COLUMN `image`;
