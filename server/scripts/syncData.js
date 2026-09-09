/**
 * 공공데이터포털(data.go.kr) 오픈API로 서울시 동물병원/동물약국 데이터를 갱신합니다.
 *
 *   행정안전부_동물_동물병원 조회서비스  https://www.data.go.kr/data/15154952/openapi.do
 *   행정안전부_동물_동물약국 조회서비스  https://www.data.go.kr/data/15155272/openapi.do
 *
 * 두 API는 파라미터와 응답 필드가 완전히 동일해서 경로만 바꿔 같은 코드로 처리합니다.
 * 원 출처는 LOCALDATA(지방행정인허가데이터)이며, 매일 갱신되어 2일 전 기준으로 현행화됩니다.
 *
 * 사용법:
 *   node scripts/syncData.js verify        인증키가 동작하는지 확인 (가장 먼저 실행)
 *   node scripts/syncData.js sync          마지막 갱신 이후 변경분만 반영
 *   node scripts/syncData.js sync --full   전체 재수집
 *   node scripts/syncData.js sync --since=20240901
 *   node scripts/syncData.js sync --type=병원 --dry-run
 *
 * server/.env 설정:
 *   DATA_GO_KR_SERVICE_KEY=발급받은_인증키
  KAKAO_REST_API_KEY=카카오_REST_API_키   (geocode 명령에만 필요)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const axios = require('axios');
const mysql = require('mysql2/promise');
const proj4 = require('proj4');

/**
 * 좌표계 변환.
 *
 * 원본은 EPSG:5181(중부원점TM)이고 지도는 WGS84 를 씁니다.
 * 예전에는 클라이언트가 조회할 때마다 3만여 건을 매번 변환했는데,
 * 적재 시점에 한 번 계산해 lat/lng 컬럼에 저장합니다.
 * (오프셋은 기존 클라이언트 보정값을 그대로 옮긴 것입니다.)
 */
proj4.defs(
  'EPSG:5181',
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs'
);

const LAT_OFFSET = 0.0028;
const LNG_OFFSET = 0.0009;

/** TM 좌표 -> { lat, lng }. 변환 불가면 null. */
function toLatLng(x, y) {
  const tmX = parseFloat(x);
  const tmY = parseFloat(y);
  if (!Number.isFinite(tmX) || !Number.isFinite(tmY)) return null;

  try {
    const [lng, lat] = proj4('EPSG:5181', 'EPSG:4326', [tmX, tmY]);
    const adjLat = lat + LAT_OFFSET;
    const adjLng = lng + LNG_OFFSET;
    if (adjLat < -90 || adjLat > 90 || adjLng < -180 || adjLng > 180) return null;
    return { lat: Number(adjLat.toFixed(7)), lng: Number(adjLng.toFixed(7)) };
  } catch {
    return null;
  }
}

const API_BASE = process.env.DATA_GO_KR_API_BASE || 'https://apis.data.go.kr/1741000';

const SERVICES = [
  { type: '병원', resource: 'animal_hospitals' },
  { type: '약국', resource: 'animal_pharmacies' },
];

// 서울 25개 자치단체 코드(개방자치단체코드). server/data 의 기존 데이터에서 추출한 실제 값입니다.
// 자치구별로 나눠 호출하므로 전국을 받아 걸러내는 것보다 호출 수가 훨씬 적습니다.
const SEOUL_ORG_CODES = [
  '3000000', '3010000', '3020000', '3030000', '3040000', '3050000', '3060000',
  '3070000', '3080000', '3090000', '3100000', '3110000', '3120000', '3130000',
  '3140000', '3150000', '3160000', '3170000', '3180000', '3190000', '3200000',
  '3210000', '3220000', '3230000', '3240000',
];

const MAX_ROWS = 100; // API 상한
const BATCH_SIZE = 500;

/**
 * 인증키. 포털은 Encoding/Decoding 두 형태를 주는데, Encoding 키를 그대로 넣으면
 * axios 가 한 번 더 인코딩해 인증에 실패합니다. %가 있으면 먼저 디코딩해 둡니다.
 */
function serviceKey() {
  const raw = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!raw) {
    throw new Error(
      '.env 에 DATA_GO_KR_SERVICE_KEY 가 필요합니다. ' +
      'https://www.data.go.kr/data/15154952/openapi.do 에서 활용신청 후 발급받으세요.'
    );
  }
  return raw.includes('%') ? decodeURIComponent(raw) : raw;
}

// ---------------------------------------------------------------- 값 변환

/** "20230316" 또는 "2023-03-16" 을 DATE 문자열로 정규화합니다. */
function toDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

/**
 * "YYYYMMDDHHMMSS" 를 DATETIME 으로 정규화합니다.
 * 기존 importData.js 는 날짜까지만 저장해 시각이 유실됐고, 그 탓에
 * "이 시점 이후 변경분"을 골라낼 수 없었습니다. 여기서는 시각까지 보존합니다.
 */
function toDateTime(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{14}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ` +
           `${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s;
  const d = toDate(s);
  return d ? `${d} 00:00:00` : null;
}

/** 좌표(EPSG:2097 중부원점TM). 클라이언트가 proj4로 변환하므로 원본 그대로 둡니다. */
function toCoord(value) {
  const num = parseFloat(value);
  return Number.isNaN(num) ? null : num.toFixed(6);
}

/**
 * DB 의 최종수정시점 → API 가 요구하는 YYYYMMDDHHMMSS
 *
 * 드라이버 설정에 따라 문자열이 오기도 하고 Date 객체가 오기도 합니다.
 * Date 로 변환해 다루면 TIMESTAMP 가 UTC 로 해석되면서 시간대만큼 밀려
 * 그 구간의 변경분을 놓칠 수 있으므로, 문자열은 문자열 그대로 처리합니다.
 */
function toStamp(value) {
  if (value instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}${p(value.getMonth() + 1)}${p(value.getDate())}` +
           `${p(value.getHours())}${p(value.getMinutes())}${p(value.getSeconds())}`;
  }
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 8) throw new Error(`최종수정시점을 해석할 수 없습니다: ${value}`);
  return digits.padEnd(14, '0').slice(0, 14);
}

// ---------------------------------------------------------------- API 호출

/**
 * 응답에서 레코드 배열과 전체 건수를 꺼냅니다.
 * 구조: response.header.resultCode / response.body.{totalCount, items.item[]}
 */
function parseResponse(data) {
  if (typeof data === 'string') {
    // 인증 실패 등은 XML 에러 문서로 돌아옵니다.
    const msg = (data.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/) ||
                 data.match(/<errMsg>(.*?)<\/errMsg>/) || [])[1];
    throw new Error(msg ? `API 오류: ${msg}` : `예상과 다른 응답: ${data.slice(0, 200)}`);
  }

  // 인증 실패는 JSON 으로도 이 형태로 돌아옵니다. (실제 응답 확인)
  const authErr = data && data.OpenAPI_ServiceResponse;
  if (authErr) {
    const h = authErr.cmmMsgHeader || {};
    throw new Error(
      `API 오류 [${h.errMsg || h.returnReasonCode || '?'}] ${h.returnAuthMsg || ''}`.trim()
    );
  }

  const response = data && data.response;
  if (!response) throw new Error(`예상과 다른 응답: ${JSON.stringify(data).slice(0, 200)}`);

  const header = response.header || {};
  // 성공 코드는 "0" 으로 돌아옵니다. ("00" 을 쓰는 다른 포털 API 도 있어 함께 허용)
  const code = header.resultCode === undefined ? null : String(header.resultCode);
  if (code !== null && code !== '0' && code !== '00') {
    throw new Error(`API 오류 [${code}] ${header.resultMsg || ''}`);
  }

  const body = response.body || {};
  const item = (body.items && body.items.item) || [];
  return {
    totalCount: Number(body.totalCount || 0),
    rows: Array.isArray(item) ? item : [item],
  };
}

async function fetchPage({ resource, orgCode, since, pageNo }) {
  const params = {
    serviceKey: serviceKey(),
    pageNo,
    numOfRows: MAX_ROWS,
    returnType: 'JSON',
  };
  if (orgCode) params['cond[OPN_ATMY_GRP_CD::EQ]'] = orgCode;
  if (since) params['cond[DAT_UPDT_PNT::GTE]'] = since;

  const res = await axios.get(`${API_BASE}/${resource}/info`, {
    params,
    timeout: 30000,
    // serviceKey 는 이미 디코딩해 두었으므로 axios 기본 직렬화에 맡깁니다.
    headers: { Accept: 'application/json' },
    // 인증 실패 시 403 과 함께 본문에 실제 사유가 담겨 옵니다.
    // 여기서 던지면 그 사유가 묻히므로 본문을 직접 해석합니다.
    validateStatus: () => true,
  });

  if (res.status >= 400 && !res.data) {
    throw new Error(`HTTP ${res.status} (응답 본문 없음)`);
  }
  return parseResponse(res.data);
}

/** 자치구 하나의 전체 페이지를 받아옵니다. */
async function fetchOrg({ resource, orgCode, since }) {
  const collected = [];
  let pageNo = 1;
  let totalCount = 0;

  do {
    const page = await fetchPage({ resource, orgCode, since, pageNo });
    if (pageNo === 1) totalCount = page.totalCount;
    if (page.rows.length === 0) break;
    collected.push(...page.rows);
    pageNo += 1;
  } while (collected.length < totalCount);

  return collected;
}

async function fetchSeoul({ resource, since, label }) {
  const all = [];
  for (let i = 0; i < SEOUL_ORG_CODES.length; i += 1) {
    const code = SEOUL_ORG_CODES[i];
    const rows = await fetchOrg({ resource, orgCode: code, since });
    all.push(...rows);
    process.stdout.write(
      `\r  ${label}: 자치구 ${i + 1}/${SEOUL_ORG_CODES.length} 조회, 누적 ${all.length}건   `
    );
  }
  process.stdout.write('\n');
  return all;
}

/**
 * 전국 수집.
 *
 * 자치단체 코드로 나누지 않고 그대로 페이지를 넘깁니다.
 * 전국 기준 병원 약 1.1만건 + 약국 약 2.1만건이고 numOfRows 상한이 100 이므로
 * 업종당 100~210 회 호출이 듭니다. (개발계정 일 10,000 회 한도 안에서 충분)
 */
async function fetchNationwide({ resource, since, label }) {
  const collected = [];
  let pageNo = 1;
  let totalCount = 0;

  do {
    const page = await fetchPage({ resource, since, pageNo });
    if (pageNo === 1) {
      totalCount = page.totalCount;
      console.log(`  ${label}: 전국 ${totalCount}건 (페이지당 ${MAX_ROWS})`);
      if (totalCount === 0) break;
    }
    if (page.rows.length === 0) break;

    collected.push(...page.rows);
    process.stdout.write(`\r  ${label}: ${collected.length}/${totalCount} 수집   `);
    pageNo += 1;
  } while (collected.length < totalCount);

  if (totalCount > 0) process.stdout.write('\n');
  return collected;
}

// ---------------------------------------------------------------- DB

function dbConfig() {
  // importData.js 와 달리 .env 를 사용합니다. 배포 DB에도 그대로 쓸 수 있습니다.
  const missing = ['DB_HOST', 'DB_USER', 'DB_NAME'].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`.env 에 다음 값이 필요합니다: ${missing.join(', ')}`);
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dateStrings: true,
    charset: 'utf8mb4',
  };
}

const COLUMNS = [
  'mgtno', 'bplcnm', 'sitewhladdr', 'rdnwhladdr', 'sitetel',
  'x', 'y', 'lat', 'lng', 'apvpermymd', 'dcbymd', 'dtlstatenm', 'trdstatenm',
  'type', 'lastmodts',
];

/** API 필드명(대문자 축약형) → 기존 DB 컬럼 */
function toValues(row, type) {
  const latLng = toLatLng(row.CRD_INFO_X, row.CRD_INFO_Y);
  return [
    row.MNG_NO,
    row.BPLC_NM,
    row.LOTNO_ADDR || null,      // 지번주소
    row.ROAD_NM_ADDR || null,    // 도로명주소
    row.TELNO || null,
    toCoord(row.CRD_INFO_X),
    toCoord(row.CRD_INFO_Y),
    latLng ? latLng.lat : null,  // WGS84 위도 (적재 시 미리 변환)
    latLng ? latLng.lng : null,  // WGS84 경도
    toDate(row.LCPMT_YMD),       // 인허가일자
    toDate(row.CLSBIZ_YMD),      // 폐업일자
    row.DTL_SALS_STTS_NM || null, // 상세영업상태명 (정상/폐업)
    row.SALS_STTS_NM || null,     // 영업상태명 (영업/정상)
    type,
    toDateTime(row.LAST_MDFCN_PNT), // 최종수정시점
  ];
}

/** 여러 건을 한 번의 INSERT 로 upsert 합니다. (기존 스크립트는 1건씩 실행) */
async function upsertBatch(conn, rows, type) {
  if (rows.length === 0) return;

  const placeholder = `(${COLUMNS.map(() => '?').join(', ')})`;
  const updates = COLUMNS
    .filter((c) => c !== 'mgtno' && c !== 'type')
    .map((c) => `${c} = VALUES(${c})`)
    .join(', ');

  const sql =
    `INSERT INTO medical_facilities (${COLUMNS.join(', ')}) VALUES ` +
    rows.map(() => placeholder).join(', ') +
    ` ON DUPLICATE KEY UPDATE ${updates}`;

  await conn.query(sql, rows.flatMap((r) => toValues(r, type)));
}

async function countRows(conn, type) {
  const [rows] = await conn.execute(
    'SELECT COUNT(*) AS c FROM medical_facilities WHERE type = ?',
    [type]
  );
  return rows[0].c;
}

/**
 * 다음 증분 수집 시작점. 별도 상태 테이블 없이 저장된 최종수정시점에서 구합니다.
 * 필터는 DAT_UPDT_PNT(데이터갱신시점)로 걸리는데 이 값은 LAST_MDFCN_PNT(최종수정시점)
 * 이후이므로, 최종수정시점을 하한으로 쓰면 놓치는 레코드 없이 안전합니다.
 */
async function getLastModified(conn, type) {
  const [rows] = await conn.execute(
    'SELECT MAX(lastmodts) AS last FROM medical_facilities WHERE type = ?',
    [type]
  );
  // Date 로 감싸지 않고 원본 그대로 넘겨 toStamp 가 판단하게 합니다.
  return rows[0] && rows[0].last ? rows[0].last : null;
}

// ---------------------------------------------------------------- 지오코딩

const KAKAO_LOCAL_URL = 'https://dapi.kakao.com/v2/local/search';

/** 카카오 로컬 API 키. 카카오 OAuth 의 client_id 와 같은 REST 키입니다. */
function kakaoKey() {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    throw new Error(
      '.env 에 KAKAO_REST_API_KEY 가 필요합니다. ' +
      'https://developers.kakao.com/console/app 의 REST API 키를 넣어주세요.'
    );
  }
  return key;
}

/**
 * 주소 한 건을 좌표로 변환합니다.
 * 주소 검색이 실패하면 상호명 키워드 검색으로 한 번 더 시도합니다.
 */
async function geocodeOne({ roadAddr, lotAddr, name }) {
  const key = kakaoKey();
  const call = async (path, query) => {
    if (!query) return null;
    const res = await axios.get(`${KAKAO_LOCAL_URL}/${path}`, {
      params: { query, size: 1 },
      headers: { Authorization: `KakaoAK ${key}` },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error(`카카오 API 인증 실패 (HTTP ${res.status}). 키를 확인해주세요.`);
    }
    const doc = res.data && res.data.documents && res.data.documents[0];
    if (!doc) return null;

    const lat = Number(doc.y);
    const lng = Number(doc.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) };
  };

  // 도로명 -> 지번 -> 상호명 순으로 시도
  return (
    (await call('address.json', roadAddr)) ||
    (await call('address.json', lotAddr)) ||
    (await call('keyword.json', name))
  );
}

/**
 * 좌표가 없는 시설을 주소로 보완합니다.
 *
 * 원본(공공데이터포털)에 좌표가 비어 오는 레코드가 상당수 있습니다.
 * 좌표가 없으면 지도에 표시되지 않으므로 주소를 좌표로 변환해 채웁니다.
 * 이미 좌표가 있는 레코드는 건드리지 않아 호출량을 아낍니다.
 */
async function geocode(options) {
  kakaoKey();
  const conn = await mysql.createConnection(dbConfig());

  try {
    const where = options.allStates
      ? '(lat IS NULL OR lng IS NULL)'
      : "(lat IS NULL OR lng IS NULL) AND (dtlstatenm IS NULL OR dtlstatenm <> '폐업')";

    const [rows] = await conn.query(
      `SELECT id, bplcnm, rdnwhladdr, sitewhladdr FROM medical_facilities
       WHERE ${where} ORDER BY id`
    );

    const targets = options.limit ? rows.slice(0, options.limit) : rows;
    console.log(
      `좌표 없는 시설 ${rows.length}건` +
      (options.allStates ? '' : ' (폐업 제외)') +
      ` 중 ${targets.length}건 처리`
    );
    if (targets.length === 0) return;

    let filled = 0;
    let failed = 0;
    const updates = [];

    for (let i = 0; i < targets.length; i += 1) {
      const row = targets[i];
      let coords = null;
      try {
        coords = await geocodeOne({
          roadAddr: row.rdnwhladdr,
          lotAddr: row.sitewhladdr,
          name: row.bplcnm,
        });
      } catch (err) {
        console.log(`\n  ${err.message}`);
        break;
      }

      if (coords) {
        updates.push([row.id, coords.lat, coords.lng]);
        filled += 1;
      } else {
        failed += 1;
      }

      process.stdout.write(
        `\r  ${i + 1}/${targets.length} 처리, 보완 ${filled} / 실패 ${failed}   `
      );
      await new Promise((r) => setTimeout(r, 60)); // 초당 약 16회
    }
    process.stdout.write('\n');

    if (options.dryRun) {
      console.log(`  [dry-run] ${updates.length}건 — DB에 쓰지 않았습니다.`);
      return;
    }

    for (let i = 0; i < updates.length; i += 500) {
      const chunk = updates.slice(i, i + 500);
      const ids = chunk.map((u) => u[0]);
      const latCase = chunk.map((u) => `WHEN ${u[0]} THEN ${u[1]}`).join(' ');
      const lngCase = chunk.map((u) => `WHEN ${u[0]} THEN ${u[2]}`).join(' ');
      await conn.query(
        `UPDATE medical_facilities
         SET lat = CASE id ${latCase} END, lng = CASE id ${lngCase} END
         WHERE id IN (${ids.join(',')})`
      );
    }

    console.log(`  보완 ${filled}건 저장 / 주소로도 못 찾은 건 ${failed}건`);
  } finally {
    await conn.end();
  }
}

// ---------------------------------------------------------------- 명령

/** 인증키가 실제로 동작하는지, 받아온 데이터가 기존 것과 맞물리는지 확인합니다. */
async function verify() {
  const conn = await mysql.createConnection(dbConfig());
  let allOk = true;

  try {
    for (const { type, resource } of SERVICES) {
      console.log(`\n[${type}] ${API_BASE}/${resource}/info`);

      let page;
      try {
        // 종로구(3010000) 한 자치구만 살짝 조회해 봅니다.
        page = await fetchPage({ resource, orgCode: '3010000', pageNo: 1 });
      } catch (err) {
        console.log(`  ✗ 호출 실패: ${err.message}`);
        allOk = false;
        continue;
      }

      if (page.rows.length === 0) {
        console.log('  ✗ 결과가 0건입니다.');
        allOk = false;
        continue;
      }

      const sample = page.rows.slice(0, 3).map((r) => r.BPLC_NM).filter(Boolean);
      console.log(`  종로구 ${page.totalCount}건, 예시: ${sample.join(', ')}`);

      const mgtnos = page.rows.map((r) => r.MNG_NO).filter(Boolean);
      const [matched] = await conn.query(
        'SELECT COUNT(*) AS c FROM medical_facilities WHERE type = ? AND mgtno IN (?)',
        [type, mgtnos]
      );
      const hit = matched[0].c;

      if (hit > 0) {
        console.log(`  ✓ 기존 '${type}' 데이터와 관리번호 ${hit}/${mgtnos.length}건 일치`);
      } else {
        console.log(`  ! 겹치는 관리번호가 없습니다 (신규 데이터일 수 있음)`);
      }
    }
  } finally {
    await conn.end();
  }

  console.log(
    allOk
      ? '\n검증 통과. `node scripts/syncData.js sync` 로 갱신하세요.'
      : '\n검증 실패. 인증키와 활용신청 승인 상태를 확인해주세요.'
  );
  process.exitCode = allOk ? 0 : 1;
}

async function sync(options) {
  const conn = await mysql.createConnection(dbConfig());
  const targets = options.type
    ? SERVICES.filter((s) => s.type === options.type)
    : SERVICES;

  if (targets.length === 0) {
    throw new Error(`--type 값이 올바르지 않습니다: ${options.type} (병원 또는 약국)`);
  }

  try {
    for (const { type, resource } of targets) {
      let since = null;
      if (options.since) {
        since = `${options.since}000000`;
      } else if (!options.full) {
        const last = await getLastModified(conn, type);
        if (last) since = toStamp(last);
      }

      console.log(`\n[${type}] ${since ? `${since} 이후 변경분` : '전체 수집'} · ${options.all ? '전국' : '서울'}`);

      const fetcher = options.all ? fetchNationwide : fetchSeoul;
      const rows = await fetcher({ resource, since, label: type });
      if (rows.length === 0) {
        console.log('  갱신할 데이터가 없습니다.');
        continue;
      }

      if (options.dryRun) {
        console.log(`  [dry-run] ${rows.length}건 — DB에 쓰지 않았습니다.`);
        console.log(`  예시: ${rows.slice(0, 3).map((r) => `${r.BPLC_NM}(${r.DTL_SALS_STTS_NM})`).join(', ')}`);
        continue;
      }

      const before = await countRows(conn, type);
      await conn.beginTransaction();
      try {
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          await upsertBatch(conn, rows.slice(i, i + BATCH_SIZE), type);
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }
      const after = await countRows(conn, type);

      const added = after - before;
      console.log(`  반영 ${rows.length}건 (신규 ${added}, 갱신 ${rows.length - added})`);
      console.log(`  '${type}' 총 ${after}건`);
    }
  } finally {
    await conn.end();
  }
}

function usage() {
  console.log(`
서울시 동물병원/동물약국 데이터 갱신 (공공데이터포털)

  node scripts/syncData.js verify              인증키 확인
  node scripts/syncData.js geocode             좌표 없는 시설을 주소로 보완
  node scripts/syncData.js geocode --limit=50 --dry-run
  node scripts/syncData.js geocode --all-states  폐업까지 포함
  node scripts/syncData.js sync                변경분만 반영 (기본)
  node scripts/syncData.js sync --all          전국 수집 (미지정 시 서울만)
  node scripts/syncData.js sync --full         전체 재수집
  node scripts/syncData.js sync --since=YYYYMMDD
  node scripts/syncData.js sync --type=병원|약국
  node scripts/syncData.js sync --dry-run      DB에 쓰지 않고 결과만 출력

server/.env 설정:
  DATA_GO_KR_SERVICE_KEY=발급받은_인증키

  활용신청: https://www.data.go.kr/data/15154952/openapi.do  (동물병원)
            https://www.data.go.kr/data/15155272/openapi.do  (동물약국)
  두 API 모두 신청해야 합니다. 개발계정 기준 일 10,000건 호출 가능.
`);
}

function parseArgs(argv) {
  const options = {
    full: false, dryRun: false, since: null, type: null, all: false,
    allStates: false, limit: null,
  };
  for (const arg of argv) {
    if (arg === '--all') options.all = true;
    else if (arg === '--all-states') options.allStates = true;
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.split('=')[1]);
    else if (arg === '--full') options.full = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--since=')) options.since = arg.split('=')[1];
    else if (arg.startsWith('--type=')) options.type = arg.split('=')[1];
  }
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('--limit 은 1 이상의 정수여야 합니다.');
  }
  if (options.since && !/^\d{8}$/.test(options.since)) {
    throw new Error(`--since 는 YYYYMMDD 형식이어야 합니다: ${options.since}`);
  }
  return options;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (command === 'geocode') return geocode(parseArgs(rest));
  if (command === 'verify') return verify();
  if (command === 'sync') return sync(parseArgs(rest));

  usage();
  process.exitCode = command ? 1 : 0;
}

main().catch((err) => {
  console.error(`\n오류: ${err.message}`);
  process.exitCode = 1;
});
