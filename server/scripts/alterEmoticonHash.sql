-- 이모티콘 그림에 지문(내용 해시)을 답니다.
--
-- 왜 필요한가
--   그림 주소가 /emoticons/3/image 인데 이 번호는 고정이 아닙니다. 하나를 지우면
--   뒤엣것이 한 칸씩 당겨 오고, 새로 등록한 것이 빈 번호를 물려받습니다
--   (controller/emoticon.js 의 deleteEmoticon). 그래서 **같은 주소가 시간에 따라
--   다른 그림을 뜻합니다.**
--
--   브라우저는 그 사실을 알 길이 없어 자기 사본을 그대로 씁니다. 실제로 재현했습니다 —
--   같은 순간 같은 주소에서 캐시를 허용하면 1,524바이트짜리 옛 PNG 가, 캐시를 무시하면
--   4,715바이트짜리 새 GIF 가 왔습니다. 캐시 시간을 1분까지 줄여도 소용이 없습니다.
--   지우고 곧바로 새로 올리는 것이 정상적인 흐름이라, 그 1분이 바로 문제가 나는 구간입니다.
--
--   주소에 이 지문을 실으면(/emoticons/3/image?v=<지문>) 그림이 바뀔 때 주소도 함께
--   바뀝니다. 겹칠 일이 없으니 오히려 캐시를 1년으로 늘려도 안전해집니다.
--
-- 왜 생성 컬럼인가
--   data 에서 값이 나오므로 애플리케이션이 따로 채울 것이 없고, 넣는 길이 하나 더
--   생겨도 어긋날 수가 없습니다. STORED 라 읽을 때 다시 계산하지 않습니다.
--   앞 16자만 씁니다 — 관리자가 고른 수십 장 안에서 겹칠 일이 없고, 설령 겹쳐도
--   그 한 장이 잠깐 낡게 보일 뿐입니다.
--
-- 적용 (먼저 백업하세요 — 이 표에는 이미 등록된 그림이 들어 있습니다)
--   docker exec -e MYSQL_PWD=<암호> petmedisearch-mysql mysql -uroot --default-character-set=utf8mb4 \
--     -e "CREATE TABLE petmedisearch.emoticons_backup AS SELECT * FROM petmedisearch.emoticons;"
--   docker exec -i -e MYSQL_PWD=<암호> petmedisearch-mysql mysql -uroot --default-character-set=utf8mb4 petmedisearch < server/scripts/alterEmoticonHash.sql
--
-- 되돌리기
--   ALTER TABLE `emoticons` DROP COLUMN `content_hash`;

SET NAMES utf8mb4;

-- data 뒤에 답니다. 생성 컬럼은 자기보다 앞에 정의된 컬럼만 가리킬 수 있습니다.
ALTER TABLE `emoticons`
  ADD COLUMN `content_hash` char(16)
    GENERATED ALWAYS AS (SUBSTRING(SHA2(`data`, 256), 1, 16)) STORED
    NOT NULL
    AFTER `data`;
