/**
 * k6 부하테스트 준비물 만들기.
 *
 * k6 스크립트가 필요로 하는 두 가지를 사본 DB 에서 꺼내 JSON 한 개로 떨굽니다.
 *
 *   ① 로그인되는 계정 — seedScale.js 가 넣은 1만 명은 비밀번호가 '$2b$12$seed' 라
 *      bcrypt.compare 가 늘 false 입니다. 그대로 두면 /auth/login 을 잴 수 없어,
 *      앞쪽 몇 명만 진짜 해시로 바꿉니다. (cleanup 이 원래 값으로 되돌립니다)
 *
 *   ② 실제로 데이터가 붙어 있는 id 들 — 후기가 몰린 시설, 댓글 300개짜리 글처럼
 *      "제일 무거운 쪽" 을 골라 둡니다. 빈 글만 두드리면 무엇이 느린지 안 보입니다.
 *
 * 토큰은 로그인을 거치지 않고 여기서 직접 발급합니다. 인증이 필요한 화면(마이페이지·
 * 즐겨찾기)을 재는 게 목적인데, VU 200개가 저마다 로그인부터 하면 bcrypt(cost 12)
 * 때문에 준비 단계만 1분 가까이 걸립니다. 로그인 자체는 따로 시나리오로 잽니다.
 *
 * 반드시 사본 DB 에 대고 도세요 (seedScale.js 와 같은 안전장치).
 *   $ SCALE_DB=petmedisearch_scale node scripts/loadtestPrepare.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const DB = process.env.SCALE_DB;
if (!DB || !DB.includes('scale')) {
  console.error('SCALE_DB 에 이름이 scale 인 사본 DB 를 지정하세요. 실제 DB 를 건드리지 않으려는 안전장치입니다.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('server/.env 의 JWT_SECRET 이 필요합니다. 서버와 같은 값이어야 토큰이 통합니다.');
  process.exit(1);
}

/** 로그인 시나리오가 쓸 계정 수. VU 200개가 돌려 써도 충분한 수입니다. */
const LOGIN_USERS = 200;
/** 인증 토큰을 미리 발급해 둘 계정 수. 마이페이지가 사람마다 다른 쿼리를 타도록 넓게 잡습니다. */
const TOKEN_USERS = 400;
/** seedScale.js 가 넣기 시작하는 user_id. 그 아래는 원래 있던 사람들이라 건드리지 않습니다. */
const FIRST_SEEDED_ID = 100;

const PASSWORD = process.env.LOADTEST_PASSWORD || 'LoadTest!2026';
const OUT_DIR = path.join(__dirname, '..', '..', 'loadtest', '.data');
/*
 * 파일을 둘로 나눕니다.
 *
 * 계정 400개는 토큰이 붙어 100KB 가 넘습니다. k6 는 이것만 SharedArray 로 올려
 * VU 전체가 한 벌을 나눠 쓰고, 나머지 자잘한 id 목록은 VU 마다 그냥 들고 있습니다.
 * 한 파일에 두면 무거운 쪽까지 VU 200개가 저마다 복사본을 갖게 됩니다.
 */
const OUT_FIXTURES = path.join(OUT_DIR, 'fixtures.json');
const OUT_USERS = path.join(OUT_DIR, 'users.json');

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB,
    charset: 'utf8mb4',
  });

  /*
   * 해시는 한 번만 만들어 돌려 씁니다.
   * cost 12 는 한 번에 0.3초쯤 걸려서, 200명을 따로 해시하면 여기서만 1분이 갑니다.
   * 소금이 같아도 로그인 검증 비용은 똑같아서 재는 데 영향이 없습니다.
   */
  const hash = await bcrypt.hash(PASSWORD, 12);

  const [people] = await db.query(
    `SELECT user_id, email, role FROM users
      WHERE user_id >= ? AND email IS NOT NULL AND deleted_at IS NULL
      ORDER BY user_id LIMIT ?`,
    [FIRST_SEEDED_ID, TOKEN_USERS]
  );

  if (people.length < LOGIN_USERS) {
    console.error(`계정이 모자랍니다 (${people.length}명). seedScale.js 를 먼저 도세요.`);
    process.exit(1);
  }

  const loginable = people.slice(0, LOGIN_USERS);
  await db.query('UPDATE users SET password = ? WHERE user_id IN (?)', [
    hash,
    loginable.map((u) => u.user_id),
  ]);

  /*
   * 앞쪽 LOGIN_USERS 명만 진짜로 로그인됩니다. 순서를 지켜 두면 k6 가 "앞에서
   * loginUserCount 개 안에서 고르기" 로 끝나, 매번 걸러내지 않아도 됩니다.
   */
  const users = people.map((u) => ({
    id: u.user_id,
    email: u.email,
    token: jwt.sign({ id: u.user_id, role: u.role || 'user' }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    }),
  }));

  /*
   * 두드릴 대상 고르기.
   *
   * 평균치가 아니라 제일 무거운 쪽을 고릅니다. 후기 5건짜리 시설과 200건짜리
   * 시설은 같은 API 라도 전혀 다른 쿼리가 되고, 문제가 나는 건 늘 뒤쪽입니다.
   */
  const [[hotFacility]] = await db.query(
    `SELECT facility_id, COUNT(*) AS n FROM reviews WHERE deleted_at IS NULL
      GROUP BY facility_id ORDER BY n DESC LIMIT 1`
  );
  const [[hotPost]] = await db.query(
    `SELECT post_id, COUNT(*) AS n FROM comments WHERE deleted_at IS NULL
      GROUP BY post_id ORDER BY n DESC LIMIT 1`
  );
  const [warmFacilities] = await db.query(
    `SELECT facility_id FROM reviews WHERE deleted_at IS NULL
      GROUP BY facility_id HAVING COUNT(*) >= 2 ORDER BY facility_id LIMIT 60`
  );
  const [withImages] = await db.query(
    'SELECT review_id FROM reviews WHERE images IS NOT NULL AND deleted_at IS NULL LIMIT 40'
  );
  const [posts] = await db.query(
    'SELECT post_id FROM posts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200'
  );
  const [categories] = await db.query('SELECT category_id FROM categories');
  const [[facilityCount]] = await db.query('SELECT COUNT(*) AS n FROM medical_facilities');

  const fixtures = {
    generatedAt: new Date().toISOString(),
    database: DB,
    password: PASSWORD,
    userCount: users.length,
    loginUserCount: LOGIN_USERS,
    hotFacilityId: hotFacility?.facility_id ?? null,
    hotPostId: hotPost?.post_id ?? null,
    facilityIds: warmFacilities.map((r) => r.facility_id),
    reviewIdsWithImages: withImages.map((r) => r.review_id),
    postIds: posts.map((r) => r.post_id),
    categoryIds: categories.map((r) => r.category_id),
    facilityCount: facilityCount.n,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // k6 의 handleSummary 는 폴더를 만들지 않습니다. 없으면 결과를 통째로 못 남깁니다.
  fs.mkdirSync(path.join(OUT_DIR, '..', 'results'), { recursive: true });
  fs.writeFileSync(OUT_FIXTURES, JSON.stringify(fixtures, null, 2), 'utf8');
  fs.writeFileSync(OUT_USERS, JSON.stringify(users), 'utf8');

  console.log(`대상 DB       : ${DB}`);
  console.log(`로그인 계정   : ${LOGIN_USERS}명 (비밀번호 ${PASSWORD})`);
  console.log(`토큰 발급     : ${users.length}개`);
  console.log(`후기 몰린 곳  : facility_id=${fixtures.hotFacilityId} (${hotFacility?.n}건)`);
  console.log(`댓글 몰린 글  : post_id=${fixtures.hotPostId} (${hotPost?.n}건)`);
  console.log(`사진 붙은 후기: ${fixtures.reviewIdsWithImages.length}건`);
  console.log(`시설          : ${fixtures.facilityCount}건`);
  console.log(`기록          : ${OUT_FIXTURES}`);
  console.log(`              : ${OUT_USERS}`);

  await db.end();
}

main().catch((error) => {
  console.error('준비 실패:', error.message);
  process.exit(1);
});
