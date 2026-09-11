-- 시설(동물병원/동물약국) 테이블.
--
-- 기존에는 이 DDL 이 README 본문에만 있어서 레포만 받으면 재현이 안 됐습니다.
-- lat/lng 는 원본 TM 좌표(x, y)를 적재 시점에 WGS84 로 변환해 담아두는 컬럼입니다.
-- (예전에는 클라이언트가 조회할 때마다 3만여 건을 proj4 로 변환했습니다.)
--
-- 적용 (createTables.sql 보다 먼저):
--   docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < createFacilitiesTable.sql
--
-- --default-character-set=utf8mb4 를 빼면 type 의 enum('약국','병원') 이 깨져
-- 적재(syncData.js)가 값을 못 넣습니다.

CREATE TABLE IF NOT EXISTS `medical_facilities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mgtno` VARCHAR(255) NOT NULL COMMENT '관리번호',
  `bplcnm` VARCHAR(255) NOT NULL COMMENT '사업장명',
  `sitewhladdr` TEXT COMMENT '지번주소',
  `rdnwhladdr` TEXT COMMENT '도로명주소',
  `sitetel` VARCHAR(20) DEFAULT NULL COMMENT '전화번호',
  `x` DECIMAL(18, 6) DEFAULT NULL COMMENT '원본 좌표 X (EPSG:5181)',
  `y` DECIMAL(18, 6) DEFAULT NULL COMMENT '원본 좌표 Y (EPSG:5181)',
  `lat` DECIMAL(10, 7) DEFAULT NULL COMMENT 'WGS84 위도 (적재 시 변환)',
  `lng` DECIMAL(10, 7) DEFAULT NULL COMMENT 'WGS84 경도 (적재 시 변환)',
  `apvpermymd` DATE DEFAULT NULL COMMENT '인허가일자',
  `dcbymd` DATE DEFAULT NULL COMMENT '폐업일자',
  `dtlstatenm` VARCHAR(50) DEFAULT NULL COMMENT '상세영업상태명(정상|폐업|말소|휴업)',
  `trdstatenm` VARCHAR(50) DEFAULT NULL COMMENT '영업상태명(영업/정상|폐업)',
  `type` ENUM('약국', '병원') NOT NULL,
  `lastmodts` TIMESTAMP NULL DEFAULT NULL COMMENT '최종수정시점',
  PRIMARY KEY (`id`),
  UNIQUE KEY `mgtno` (`mgtno`, `type`),
  -- 지도 화면 범위 조회용
  KEY `idx_latlng` (`lat`, `lng`),
  KEY `idx_state` (`dtlstatenm`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 이미 테이블이 있는 환경에서 lat/lng 를 추가할 때:
--
-- ALTER TABLE medical_facilities
--   ADD COLUMN lat DECIMAL(10,7) NULL AFTER y,
--   ADD COLUMN lng DECIMAL(10,7) NULL AFTER lat,
--   ADD INDEX idx_latlng (lat, lng),
--   ADD INDEX idx_state (dtlstatenm);
--
-- 추가 후 `node scripts/syncData.js sync --all --full` 로 다시 적재하면 채워집니다.
