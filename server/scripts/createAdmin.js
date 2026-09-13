/**
 * 관리자 계정을 만들거나, 이미 있으면 비밀번호를 다시 설정합니다.
 *
 * 일반 로그인(POST /auth/login)으로 들어갈 수 있는 계정이라, 소셜 칸은 비우고
 * email·password 만 채웁니다. role 은 'admin' 입니다.
 *
 * 사용법:
 *   ADMIN_PASSWORD='...' node scripts/createAdmin.js
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD='...' node scripts/createAdmin.js
 *
 * ADMIN_PASSWORD 는 반드시 주어야 합니다.
 * 예전에는 값을 안 주면 'Admin!2345' 로 만들었는데, 그 비밀번호가 이 파일에 적혀
 * 있으므로 저장소를 볼 수 있는 사람은 누구나 관리자로 들어올 수 있었습니다.
 * 기본값을 두면 "나중에 바꾸자" 가 그대로 운영에 올라갑니다.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const SALT_ROUNDS = 12;

/** server/controller/auth.js 의 MIN_PASSWORD_LENGTH 와 같은 값이어야 합니다. */
const MIN_PASSWORD_LENGTH = 8;

const password = process.env.ADMIN_PASSWORD || '';
if (!password) {
  console.error('ADMIN_PASSWORD 가 필요합니다.');
  console.error("  예) ADMIN_PASSWORD='고른-비밀번호' npm run create-admin");
  process.exit(1);
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`ADMIN_PASSWORD 는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  process.exit(1);
}

const admin = {
  email: (process.env.ADMIN_EMAIL || 'admin@petmedisearch.local').toLowerCase(),
  password,
  username: process.env.ADMIN_NAME || '관리자',
  phone: (process.env.ADMIN_PHONE || '01000000000').replace(/[^0-9]/g, ''),
  address: process.env.ADMIN_ADDRESS || '서울특별시 중구 세종대로 110',
};

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const hashed = await bcrypt.hash(admin.password, SALT_ROUNDS);

    // 이메일에 UNIQUE 가 걸려 있어서, 이미 있으면 UPDATE 로 넘어갑니다.
    // 그래서 비밀번호를 잊었을 때 이 스크립트를 다시 돌리면 됩니다.
    await conn.execute(
      `INSERT INTO users (username, email, password, phone, address, role)
       VALUES (?, ?, ?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         password = VALUES(password),
         phone    = VALUES(phone),
         address  = VALUES(address),
         role     = 'admin'`,
      [admin.username, admin.email, hashed, admin.phone, admin.address]
    );

    const [rows] = await conn.execute(
      'SELECT user_id, username, email, role FROM users WHERE email = ?',
      [admin.email]
    );
    const row = rows[0];

    console.log('관리자 계정 준비됨');
    console.log(`  user_id  ${row.user_id}`);
    console.log(`  이름     ${row.username}`);
    console.log(`  이메일   ${row.email}`);
    console.log(`  role     ${row.role}`);
    // 비밀번호는 찍지 않습니다. 터미널 기록과 CI 로그에 그대로 남습니다.
    console.log('비밀번호는 ADMIN_PASSWORD 로 준 값입니다.');
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('관리자 계정 생성 실패:', error.message);
  process.exit(1);
});
