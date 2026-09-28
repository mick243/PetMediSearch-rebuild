import '../loadEnv.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';

/*
 * Prisma 클라이언트 하나. 저장소(repositories/*)만 이것을 씁니다.
 *
 * 예전에는 mysql2 로 커넥션 하나를 앱 전체가 나눠 썼습니다. 쿼리가 한 줄로 서고, MySQL 의
 * wait_timeout(8시간)에 끊긴 뒤 되살아나지 않았습니다. 풀은 필요할 때 만들고 죽은 것은 버립니다.
 *
 * 동시에 열어 둘 커넥션 수. MySQL 의 max_connections 는 기본 151 입니다. 앱을 여러 개 띄우면
 * 이 값에 인스턴스 수를 곱한 만큼 잡으므로, 늘릴 때는 DB 쪽도 함께 봐야 합니다.
 */
const CONNECTION_LIMIT = Number(process.env.DB_POOL_SIZE) || 10;

const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: CONNECTION_LIMIT,

    /*
     * MySQL 8 의 기본 인증(caching_sha2_password)은 계정이 **처음** 붙을 때 서버의 RSA 공개키로
     * 암호를 감싸 보냅니다(TLS 가 없을 때). 이 드라이버는 기본으로 그 키를 서버에 요청하지 않아,
     * 새 계정의 첫 접속이 실패했습니다 — 서버 재시작 뒤에도 마찬가지입니다(캐시가 비므로).
     * mysql2 를 같이 쓰던 동안은 mysql2 가 먼저 붙어 캐시를 데워 놓아 드러나지 않았습니다.
     * 기준선(앱 계정을 매번 새로 만듦)에서 모든 요청이 8초 뒤 P2010 으로 끝나 찾았습니다.
     *
     * DB 와 TLS 로 붙는다면 이 옵션은 필요 없습니다(그때는 ssl 을 켜고 이 줄을 지웁니다).
     */
    allowPublicKeyRetrieval: true,

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
