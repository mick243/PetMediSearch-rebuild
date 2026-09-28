import './loadEnv.js';
import mysql from 'mysql2';

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
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,

  /**
   * 자리표시자(?)에 객체가 오면 문자열로만 넣습니다.
   *
   * 기본값에서 mysql2 는 객체를 `컬럼 = 값` 목록으로 풀어 SQL 에 끼워 넣습니다.
   * 요청 본문(JSON)과 쿼리스트링(Express 4 는 `?a[b]=1` 을 객체로 만듭니다)은 객체가
   * 될 수 있어서, 값 하나로 WHERE 조건의 모양이 바뀌었습니다. 실제로
   * `social_id = ?` 가 `` social_id = `x` = 1 `` 이 되어 DB 오류로 서버가 죽었고,
   * `` email = `email` = 1 `` 은 모든 행을 잡았습니다. 이 앱은 `SET ?` 처럼 객체를
   * 풀어 쓰는 곳이 없어 막아도 잃는 것이 없습니다. Date·Buffer·배열(IN (?))은
   * 그대로입니다.
   *
   * 값의 타입은 여전히 입구에서 봐야 합니다(controller/validate.ts). 이 설정은
   * 거기서 빠뜨린 곳이 SQL 을 바꾸지 못하게 하는 마지막 그물입니다.
   */
  stringifyObjects: true,

  /**
   * Node 가 보내는 Date 를 어느 시간대의 벽시계로 적을지.
   *
   * 기본값은 'local' 이라 프로세스가 도는 기계의 시간대를 따라갑니다. DB 세션은
   * +09:00 인데(docker-compose 의 --default-time-zone) 컨테이너에 TZ 가 없어 Node 가
   * UTC 로 돌면, new Date() 로 넣는 deleted_at·terms_agreed_at 이 9시간 어긋난
   * 순간으로 저장됩니다. 한 표 안에 CURRENT_TIMESTAMP 가 넣은 값과 9시간 벌어진
   * 값이 섞입니다 — 실제로 같은 순간에 쓴 두 값이 32,400초 차이가 났습니다.
   *
   * 양쪽을 같은 값으로 못박아 어디서 돌든 같게 만듭니다.
   * 한국은 서머타임이 없어 고정 오프셋으로 정확합니다.
   */
  timezone: '+09:00',

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

export default pool;