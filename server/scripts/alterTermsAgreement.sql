-- 약관 동의 기록.
--
-- 화면에 동의 체크박스를 두는 것만으로는 "동의를 받았다" 를 증명할 수 없습니다.
-- 체크는 브라우저에서만 일어나고 서버에는 아무 흔적도 남지 않기 때문입니다.
-- 동의한 시각을 남겨, 나중에 누가 언제 동의했는지 확인할 수 있게 합니다.
--
-- 필수 동의(만 14세 이상 · 이용약관 · 개인정보 수집·이용)는 셋 다 받아야 가입이
-- 되므로 시각 하나로 함께 기록합니다. 나중에 선택 동의(마케팅 수신 등)가 생기면
-- 그때는 항목별로 나눠야 합니다.
--
-- 이미 가입한 계정은 NULL 로 남습니다. 이 기능이 생기기 전에 가입했다는 뜻이고,
-- 없는 동의를 있었던 것처럼 채워 넣지 않습니다.
--
-- 적용:
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < alterTermsAgreement.sql

-- 이 파일은 UTF-8 로 쓰여 있습니다. 아래 한 줄이 없으면 mysql 클라이언트가
-- latin1 로 읽어 한글이 조용히 깨집니다 ('통합' → 'í†µí•©').
-- 특히 docker-entrypoint-initdb.d 로 도는 초기화에는 charset 플래그를 붙일 자리가 없습니다.
SET NAMES utf8mb4;

ALTER TABLE `users`
  ADD COLUMN `terms_agreed_at` timestamp(3) NULL DEFAULT NULL
    COMMENT '필수 약관에 동의한 시각. 이 기능 이전 가입자는 NULL';
