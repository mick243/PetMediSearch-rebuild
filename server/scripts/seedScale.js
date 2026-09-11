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
/** 후기가 몰리는 곳. 유명한 병원 한 곳에 후기가 쏠리는 실제 모양을 만듭니다. */
const HOT_FACILITY = 40582;

// 브라우저가 줄여 보내는 크기 그대로 흉내 냅니다. 320px JPEG ≈ 20KB → base64 ≈ 27KB
const PET_PHOTO = 'data:image/jpeg;base64,' + 'A'.repeat(27000);
// 720px JPEG ≈ 80KB → base64 ≈ 107KB
const REVIEW_IMAGE = 'data:image/jpeg;base64,' + 'B'.repeat(107000);
const bodyOf = (i) => `<p>${'커뮤니티 글 본문입니다. '.repeat(40)}#${i}</p>`; // ≈ 2KB

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
      [100 + i, `보호자${i}`, `u${i}@example.com`, '$2b$12$seed', '01000000000', '서울시', 'user']),
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
      [i + 1, 1 + (i % N_POSTS), 100 + (i % N_USERS), `댓글 ${i}`, new Date(Date.now() - i * 8e5)]),
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
    (SELECT COUNT(*) FROM pets) pets, (SELECT COUNT(*) FROM favorite_facilities) favorites`);
  console.log('완료:', counts);
  await db.end();
}

main().catch((error) => {
  console.error('생성 실패:', error.message);
  process.exit(1);
});
