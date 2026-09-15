/**
 * 성능 측정용 데이터 생성기.
 *
 * 가입자 1만 · DAU 2천 규모가 1년쯤 쌓았을 법한 양을 흉내 냅니다. 실제 DB 는
 * 글이 몇 건뿐이라 그대로 재면 어떤 쿼리도 빨라서, 무엇이 문제인지 드러나지 않습니다.
 *
 * 반드시 사본 DB 에 대고 도세요. 대상 표를 통째로 비웁니다.
 *   mysql> CREATE DATABASE petmedisearch_scale;
 *   $ mysqldump petmedisearch | mysql petmedisearch_scale
 *   $ SCALE_DB=petmedisearch_scale node scripts/seedScale.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const DB = process.env.SCALE_DB;
if (!DB || !DB.includes('scale')) {
  console.error('SCALE_DB 에 이름이 scale 인 사본 DB 를 지정하세요. 실제 DB 를 지우지 않으려는 안전장치입니다.');
  process.exit(1);
}

const N_USERS = 10000, N_POSTS = 20000, N_COMMENTS = 60000;
const N_FAVS = 25000, N_PETS = 6000, N_REVIEWS = 15000;
/**
 * 아이 하나당 접종·검진 일정 수.
 *
 * 5건이면 6000마리에 3만 행입니다. scripts/alterVaccinationReminders.sql 이
 * 인덱스를 붙이며 잡은 규모(아이당 5건)와 같은 숫자입니다.
 */
const N_VACCINATIONS_PER_PET = 5;
/** 후기가 몰리는 곳. 유명한 병원 한 곳에 후기가 쏠리는 실제 모양을 만듭니다. */
const HOT_FACILITY = 40582;
/**
 * 댓글이 몰리는 글.
 *
 * 6만 건을 2만 글에 고르게 나누면 글마다 3건씩이라, 댓글 페이지네이션이 한 쪽도
 * 넘어가지 않습니다. 실제로 터진 자리는 늘 댓글이 쏠린 글 하나였습니다
 * (스레드 전체를 한 번에 내려주던 때 68,081B → 1,363B 로 줄인 그 글).
 * 후기 쪽 HOT_FACILITY 와 같은 뜻입니다.
 */
const HOT_POST = 1, N_HOT_COMMENTS = 300;

// 브라우저가 줄여 보내는 크기 그대로 흉내 냅니다. 320px JPEG ≈ 20KB → base64 ≈ 27KB
const PET_PHOTO = 'data:image/jpeg;base64,' + 'A'.repeat(27000);
// 720px JPEG ≈ 80KB → base64 ≈ 107KB
const REVIEW_IMAGE = 'data:image/jpeg;base64,' + 'B'.repeat(107000);
const bodyOf = (i) => `<p>${'커뮤니티 글 본문입니다. '.repeat(40)}#${i}</p>`; // ≈ 2KB

/**
 * 시드 계정의 비밀번호 자리.
 *
 * 진짜 bcrypt 해시가 아니라 bcrypt.compare 가 늘 false 를 돌려주는 자리표시자입니다.
 * 1만 명을 cost 12 로 해시하면 그것만 50분이 걸립니다.
 *
 * 로그인을 재려면 scripts/loadtestPrepare.js 가 앞쪽 몇 명만 진짜 해시로 바꾸고,
 * scripts/loadtestCleanup.js 가 이 값으로 되돌립니다 — 세 파일이 같은 값을 봅니다.
 */
const SEED_PASSWORD_HASH = '$2b$12$seed';

const rnd = (n) => 1 + Math.floor(Math.random() * n);

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB,
    charset: 'utf8mb4',
  });

  // 표를 비우는 순서를 신경 쓰지 않으려고 잠깐 끕니다.
  await db.query('SET FOREIGN_KEY_CHECKS=0');

  const insert = async (sql, rows, size) => {
    for (let i = 0; i < rows.length; i += size) {
      await db.query(sql, [rows.slice(i, i + size)]);
    }
  };

  console.log('users…');
  await db.query('DELETE FROM users WHERE user_id >= 100');
  await insert(
    'INSERT INTO users (user_id, username, email, password, phone, address, role) VALUES ?',
    Array.from({ length: N_USERS }, (_, i) =>
      [100 + i, `보호자${i}`, `u${i}@example.com`, SEED_PASSWORD_HASH, '01000000000', '서울시', 'user']),
    500);

  console.log('posts…');
  await db.query('DELETE FROM posts');
  await insert(
    'INSERT INTO posts (post_id, category_id, user_id, title, content, created_at) VALUES ?',
    Array.from({ length: N_POSTS }, (_, i) =>
      [i + 1, 1 + (i % 9), 100 + (i % N_USERS), `글 제목 ${i}`, bodyOf(i), new Date(Date.now() - i * 26e5)]),
    200);

  console.log('comments…');
  await db.query('DELETE FROM comments');
  await insert(
    'INSERT INTO comments (comment_id, post_id, user_id, content, created_at) VALUES ?',
    Array.from({ length: N_COMMENTS }, (_, i) =>
      [i + 1, i < N_HOT_COMMENTS ? HOT_POST : 1 + (i % N_POSTS), 100 + (i % N_USERS),
        `댓글 ${i}`, new Date(Date.now() - i * 8e5)]),
    500);

  console.log('favorites…');
  await db.query('DELETE FROM favorite_facilities');
  const pairs = new Map();
  for (let i = 0; i < N_FAVS; i += 1) pairs.set(`${100 + (i % N_USERS)}:${rnd(31000)}`, true);
  await insert('INSERT INTO favorite_facilities (user_id, facility_id) VALUES ?',
    [...pairs.keys()].map((k) => k.split(':').map(Number)), 500);

  console.log('pets…');
  await db.query('DELETE FROM pets');
  await insert(
    'INSERT INTO pets (pet_id, user_id, name, category_id, breed, photo) VALUES ?',
    Array.from({ length: N_PETS }, (_, i) =>
      [i + 1, 100 + i, `아이${i}`, 2 + (i % 8), '믹스', PET_PHOTO]),
    100);

  /*
   * 접종·검진 일정.
   *
   * 아이 화면과 알림 배치가 둘 다 이 표를 봅니다. 비워 두면 /pets 가 늘 빈 목록을
   * 붙여 보내 실제보다 가볍게 나오고, 알림 배치는 아무것도 고르지 못해
   * (done, due_date) 인덱스가 일하는지 확인할 수 없습니다.
   *
   * 지난 것과 앞으로 올 것을 섞습니다. 화면은 마감이 가까운 순으로 정렬하고
   * 완료한 줄은 뒤로 미루므로, 한쪽만 있으면 그 정렬이 제대로 돌아가는지 모릅니다.
   */
  console.log('vaccinations…');
  await db.query('DELETE FROM pet_vaccinations');
  const VACCINE_NAMES = ['종합백신', '광견병', '켄넬코프', '심장사상충', '건강검진'];
  await insert(
    'INSERT INTO pet_vaccinations (pet_id, name, due_date, due_time, done) VALUES ?',
    Array.from({ length: N_PETS * N_VACCINATIONS_PER_PET }, (_, i) => {
      const petId = 1 + Math.floor(i / N_VACCINATIONS_PER_PET);
      const slot = i % N_VACCINATIONS_PER_PET;
      // 앞 세 칸은 지난 일정(대개 완료), 뒤 두 칸은 앞으로 올 일정입니다.
      const daysFromNow = slot < 3 ? -30 * (3 - slot) : 7 * (slot - 2);
      const due = new Date(Date.now() + daysFromNow * 864e5);
      return [
        petId,
        VACCINE_NAMES[slot],
        due.toISOString().slice(0, 10),
        // 시각은 선택입니다. 병원 예약을 잡은 것만 붙습니다 (alterVaccinationTime.sql).
        i % 4 === 0 ? '15:00:00' : null,
        daysFromNow < 0 ? 1 : 0,
      ];
    }),
    1000);

  console.log('reviews…');
  await db.query('DELETE FROM reviews');
  const reviews = Array.from({ length: N_REVIEWS }, (_, i) => {
    const hot = i < 200;
    return [i + 1, 100 + (i % N_USERS), hot ? HOT_FACILITY : rnd(31000), 1 + (i % 5), `후기 ${i}`,
      hot && i % 3 === 0 ? JSON.stringify([REVIEW_IMAGE, REVIEW_IMAGE]) : null,
      new Date(Date.now() - i * 3e6)];
  });
  await insert(
    'INSERT INTO reviews (review_id, user_id, facility_id, rating, review_content, images, created_at) VALUES ?',
    reviews, 50);

  await db.query('SET FOREIGN_KEY_CHECKS=1');

  const [[counts]] = await db.query(`SELECT
    (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM posts) posts,
    (SELECT COUNT(*) FROM comments) comments, (SELECT COUNT(*) FROM reviews) reviews,
    (SELECT COUNT(*) FROM pets) pets, (SELECT COUNT(*) FROM favorite_facilities) favorites,
    (SELECT COUNT(*) FROM pet_vaccinations) vaccinations`);
  console.log('완료:', counts);
  await db.end();
}

main().catch((error) => {
  console.error('생성 실패:', error.message);
  process.exit(1);
});
