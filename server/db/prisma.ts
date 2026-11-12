import '../loadEnv.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';

/*
 * Prisma 클라이언트 하나. 저장소(repositories/*)만 이것을 씁니다.
 *
 * mysql2 풀(mysql.ts)과 같은 접속 정보로 붙습니다. 모듈을 하나씩 옮기는 동안은 두 풀이
 * 같이 도므로, 이쪽 커넥션 수는 작게 둡니다 — 둘을 합친 수가 MySQL 의 max_connections(기본
 * 151)에 인스턴스 수를 곱한 만큼 잡습니다. 다 옮기면 mysql.ts 를 지우고 이 값을 DB_POOL_SIZE
 * 로 합칩니다.
 */
const CONNECTION_LIMIT = Number(process.env.PRISMA_POOL_SIZE) || 5;

const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: CONNECTION_LIMIT,

    /*
     * 세션 시간대를 UTC 로 못박습니다.
     *
     * DB 는 +09:00 으로 뜹니다(docker-compose 의 --default-time-zone). 어댑터는 TIMESTAMP 를
     * 세션 시간대의 벽시계로 받아 그 숫자를 UTC 로 읽어 Date 를 만들기 때문에, 세션이 +09:00
     * 이면 KST 10:00 에 쓴 글이 10:00Z(= KST 19:00)로 돌아옵니다 — 실제로 9시간 어긋났습니다.
     * 세션을 UTC 로 두면 DB 가 저장된 순간을 UTC 벽시계로 내주고 Date 도 그 순간이 됩니다.
     * 넣을 때도 같은 이유로 정확합니다. 응답의 KST 문자열은 db/format.ts 가 만듭니다.
     */
    initSql: ["SET time_zone = '+00:00'"],
});

const prisma = new PrismaClient({
    adapter,

    /*
     * 큰 컬럼과 비밀은 기본으로 빼고 읽습니다. 필요한 자리에서만 `omit: { photo: false }` 처럼 켭니다.
     *
     * 사진은 한 장에 100KB 가 넘어 목록에 실리면 안 됩니다(CLAUDE.md §2.5). 비밀번호 해시는
     * 로그인 확인 한 곳 말고는 읽을 일이 없고, 응답에 새면 안 됩니다. `SELECT *` 였던 자리가
     * 그대로 옮겨져 사진이 다시 실리는 일을 막습니다 — 마이페이지 후기가 그렇게 214KB 였습니다.
     */
    omit: {
        review: { images: true },
        emoticon: { data: true },
        pet: { photo: true },
        user: { password: true },
    },
});

export default prisma;
