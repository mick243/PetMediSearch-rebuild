/**
 * 앱이 DB 에 붙을 전용 계정을 만들거나, 이미 있으면 암호와 권한을 다시 맞춥니다.
 *
 * 예전에는 앱이 root 로 접속했습니다(.env.example 의 DB_USER=root). 그러면 쿼리 하나가
 * 잘못됐을 때 피해가 이 앱의 표에서 끝나지 않습니다. root 는 다른 DB, 계정 표, 서버 파일을
 * 읽고 쓰는 권한까지 갖고 있습니다. 앱에는 자기 DB 의 행을 읽고 쓰는 권한만 줍니다.
 *
 * 만들 계정은 server/.env 의 DB_USER · DB_PASSWORD 입니다. root 암호는 돌릴 때만 넘깁니다.
 *   DB_ROOT_PASSWORD='...' node scripts/createDbUser.js
 *   docker compose --env-file server/.env exec -e DB_ROOT_PASSWORD='...' api node scripts/createDbUser.js
 *
 * 다시 돌려도 됩니다. 암호를 .env 의 값으로 맞추고 권한을 아래 목록으로 되돌립니다.
 * 권한을 걷었다가 다시 주는 사이 잠깐 쿼리가 실패할 수 있어, 요청이 적을 때 돌리세요.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

/** 암호 길이 하한. 개발 DB 의 root 가 'password' 였던 것을 되풀이하지 않으려는 값입니다. */
const MIN_PASSWORD_LENGTH = 16;

/**
 * 계정을 맞추는 문장들. 값은 mysql2 가 자리표시자로 넣습니다(?? 는 이름, ? 는 값).
 *
 * 권한은 자기 DB 의 SELECT · INSERT · UPDATE · DELETE 와 emoticons 표 하나의 ALTER 입니다.
 * ALTER 는 이모티콘을 지운 뒤 AUTO_INCREMENT 를 되돌리는 데 씁니다
 * (controller/emoticon.js 의 deleteEmoticon). 이게 없으면 삭제는 커밋됐는데 응답은 500 이 됩니다.
 *
 * 스키마 변경(alter*.sql), 백업(backup.sh), 규모 시드(seedScale.js)는 이 계정이 아니라 root 로 합니다.
 */
function statements({ user, password, database }) {
  return [
    ["CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?", [user, password]],
    ["ALTER USER ?@'%' IDENTIFIED BY ?", [user, password]],
    // 예전에 더 넓게 줬던 권한(compose 가 처음 만들 때 준 그 DB 의 모든 권한 등)을 걷어냅니다.
    ["REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'", [user]],
    ["GRANT SELECT, INSERT, UPDATE, DELETE ON ??.* TO ?@'%'", [database, user]],
    ["GRANT ALTER ON ??.`emoticons` TO ?@'%'", [database, user]],
  ];
}

/** 돌리기 전에 설정을 봅니다. 문제가 있으면 문구, 없으면 null. */
function checkSettings({ user, password, database, rootPassword }) {
  if (!rootPassword) return "DB_ROOT_PASSWORD 가 필요합니다.  예) DB_ROOT_PASSWORD='...' node scripts/createDbUser.js";
  if (!user || !database) return 'server/.env 에 DB_USER 와 DB_NAME 이 있어야 합니다.';
  if (user === 'root') return 'DB_USER 가 root 입니다. 앱 전용 이름(예: petmedisearch_app)으로 바꾸세요.';
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `DB_PASSWORD 는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.  생성: node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`;
  }
  return null;
}

async function main() {
  const settings = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    rootPassword: process.env.DB_ROOT_PASSWORD,
  };
  const problem = checkSettings(settings);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_ROOT_USER || 'root',
    password: settings.rootPassword,
  });

  try {
    for (const [sql, values] of statements(settings)) {
      await conn.query(sql, values);
    }
    console.log('앱 DB 계정 준비됨');
    console.log(`  계정  ${settings.user}@'%'`);
    console.log(`  권한  ${settings.database}.* 의 SELECT · INSERT · UPDATE · DELETE, ${settings.database}.emoticons 의 ALTER`);
    // 암호는 찍지 않습니다. 터미널 기록과 CI 로그에 그대로 남습니다.
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    // error 를 통째로 찍지 않습니다. mysql2 오류의 sql 에 암호가 든 문장이 그대로 있습니다.
    console.error('앱 DB 계정 준비 실패:', error.code || '', error.sqlMessage || error.message);
    process.exit(1);
  });
}

module.exports = { statements, checkSettings, MIN_PASSWORD_LENGTH };
