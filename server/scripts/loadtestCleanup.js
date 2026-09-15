/**
 * 부하테스트가 바꿔 놓은 것 되돌리기.
 *
 * 쓰기 시나리오가 댓글과 후기를 실제로 남깁니다. 그대로 두면 다음에 잴 때
 * 댓글 수가 계속 늘어 앞 측정과 비교가 안 됩니다.
 *
 * 지우는 기준은 k6 가 붙인 표시(LOADTEST_MARK)뿐입니다. 사람이 쓴 글은 이 표시가
 * 없어 걸리지 않습니다 — 기간이나 user_id 로 지우면 남의 것까지 날아갑니다.
 *
 *   $ SCALE_DB=petmedisearch_scale node scripts/loadtestCleanup.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB = process.env.SCALE_DB;
if (!DB || !DB.includes('scale')) {
  console.error('SCALE_DB 에 이름이 scale 인 사본 DB 를 지정하세요.');
  process.exit(1);
}

/** k6 스크립트(loadtest/k6/load.js)의 MARK 와 같은 값이어야 합니다. */
const LOADTEST_MARK = '[k6]';
/** seedScale.js 의 SEED_PASSWORD_HASH 와 같은 값이어야 합니다. 그 값으로 되돌립니다. */
const SEED_PASSWORD_HASH = '$2b$12$seed';

const DATA_DIR = path.join(__dirname, '..', '..', 'loadtest', '.data');
const FIXTURES = path.join(DATA_DIR, 'fixtures.json');
const USERS = path.join(DATA_DIR, 'users.json');

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB,
    charset: 'utf8mb4',
  });

  const [comments] = await db.query('DELETE FROM comments WHERE content LIKE ?', [
    `${LOADTEST_MARK}%`,
  ]);
  const [reviews] = await db.query('DELETE FROM reviews WHERE review_content LIKE ?', [
    `${LOADTEST_MARK}%`,
  ]);

  /*
   * 비밀번호는 seedScale.js 가 넣었던 값으로 돌려놓습니다.
   * 어떤 계정을 바꿨는지는 .data 에만 남아 있어, 그 파일이 있을 때만 됩니다.
   */
  let restored = 0;
  if (fs.existsSync(FIXTURES) && fs.existsSync(USERS)) {
    const fixtures = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
    const users = JSON.parse(fs.readFileSync(USERS, 'utf8'));
    const ids = users.slice(0, fixtures.loginUserCount).map((u) => u.id);
    if (ids.length > 0) {
      const [result] = await db.query('UPDATE users SET password = ? WHERE user_id IN (?)', [
        SEED_PASSWORD_HASH,
        ids,
      ]);
      restored = result.affectedRows;
    }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  } else {
    console.warn(`${DATA_DIR} 가 없어 비밀번호는 되돌리지 못했습니다.`);
  }

  console.log(`대상 DB        : ${DB}`);
  console.log(`지운 댓글      : ${comments.affectedRows}건`);
  console.log(`지운 후기      : ${reviews.affectedRows}건`);
  console.log(`되돌린 비밀번호: ${restored}개`);

  await db.end();
}

main().catch((error) => {
  console.error('정리 실패:', error.message);
  process.exit(1);
});
