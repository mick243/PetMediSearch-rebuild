const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

/*
 * DB 연결 풀.
 *
 * 예전에는 createConnection 으로 커넥션 하나를 만들어 앱 전체가 나눠 썼습니다.
 * 두 가지가 문제였습니다.
 *
 *   1. 쿼리가 한 줄로 섭니다. 커넥션이 하나라 앞 쿼리가 끝나야 다음이 갑니다.
 *      DAU 2000 을 가정한 규모에서는 여기가 그대로 병목입니다.
 *
 *   2. 끊기면 되살아나지 않습니다. MySQL 의 wait_timeout 이 8시간이라 밤새
 *      요청이 없으면 커넥션이 닫히고, 아침의 모든 요청이 PROTOCOL_CONNECTION_LOST
 *      로 실패합니다. 서버를 다시 띄우기 전까지 회복되지 않습니다.
 *      DB 를 재시작하거나 네트워크가 한 번 끊겨도 같습니다.
 *
 * 풀은 필요할 때 커넥션을 만들고, 죽은 것은 버리고 새로 엽니다.
 * query() 의 사용법은 커넥션과 같아서 부르는 쪽은 고칠 것이 없습니다.
 */

/**
 * 동시에 열어 둘 커넥션 수.
 *
 * MySQL 의 max_connections 는 기본 151 입니다. 앱을 여러 개 띄우면 이 값에
 * 인스턴스 수를 곱한 만큼 잡으므로, 늘릴 때는 DB 쪽도 함께 봐야 합니다.
 */
const CONNECTION_LIMIT = Number(process.env.DB_POOL_SIZE) || 10;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,

  connectionLimit: CONNECTION_LIMIT,
  // 풀이 다 찼으면 기다립니다. 곧바로 실패시키면 잠깐 몰린 것만으로 오류가 납니다.
  waitForConnections: true,
  queueLimit: 0,

  /*
   * 노는 커넥션을 MySQL 이 끊기 전에 우리가 먼저 닫습니다.
   * 서버가 모르는 사이에 죽은 커넥션을 집어 드는 일을 줄입니다.
   */
  idleTimeout: 60_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
});

module.exports = pool;
