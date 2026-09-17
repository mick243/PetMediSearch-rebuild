require('dotenv').config();
const express = require("express");
const mysql = require("./mysql");
const nodePath = require("path");
const cors = require("cors");
const { logError } = require('./logError');
const helmet = require("helmet");

const app = express();
const port = Number(process.env.PORT) || 8080;
const isProduction = process.env.NODE_ENV === 'production';

console.log('Current directory:', __dirname);

/*
 * 프록시(nginx·플랫폼) 뒤에서는 req.ip 가 전부 프록시 주소가 됩니다.
 * 그러면 요청 제한이 모든 사용자를 한 사람으로 묶어 버려, 누구 하나가 많이 쓰면
 * 나머지가 같이 막힙니다. X-Forwarded-For 를 믿을지 환경변수로 정합니다.
 */
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

/*
 * 보안 헤더.
 *
 * CSP 는 끕니다. 이 서버는 JSON 을 돌려주는 API 이고 화면은 다른 오리진(Vercel)에
 * 있어서 여기 CSP 는 그 화면에 걸리지 않습니다. 반대로 기본 CSP 를 켜면 이 서버가
 * 직접 띄우는 Swagger UI 가 인라인 스크립트를 못 써서 깨집니다.
 *
 * CORP 는 cross-origin 으로 둡니다. 기본값(same-origin)은 다른 오리진의 화면이
 * 이 서버의 응답을 읽는 것을 막습니다.
 */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 미들웨어 설정
const allowedOrigins = (process.env.CORS_ORIGIN || "https://pet-medi-search.vercel.app")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
// 반려동물 사진은 축소된 JPEG 를 data URL 로 본문에 실어 보냅니다. 기본 100kb 로는 모자랍니다.
app.use(express.json({ limit: '3mb' }));

/*
 * swagger 연동.
 *
 * 운영에서는 띄우지 않습니다. 엔드포인트와 요청·응답 모양이 전부 담겨 있어,
 * 공개하면 어디를 두드려 봐야 하는지 알려주는 안내문이 됩니다.
 */
if (!isProduction) {
  const { swaggerUi, specs } = require("./swagger/swagger");
  app.use("/api", swaggerUi.serve, swaggerUi.setup(specs));
}
app.use(express.static("public"));

/*
 * 요청 제한. 로그인·가입은 routes/auth.js 에서 더 좁게 겁니다.
 *
 * 개발에서도 켜 둡니다. 한쪽에서만 도는 장치는 "개발에서는 됐는데" 를 만들고,
 * 정작 운영에서 처음 걸릴 때 원인을 찾기 어렵습니다.
 */
const { generalLimiter } = require('./middleware/rateLimit');
app.use(generalLimiter);

/*
 * 상태 확인.
 *
 * 서버가 살아 있다는 것만으로는 모자랍니다. 프로세스는 떠 있는데 DB 에 닿지
 * 못하는 상태가 가장 흔하고, 그때도 200 을 주면 배포 도구와 감시 도구는
 * 멀쩡하다고 봅니다. 실제로 쿼리를 한 번 던져 보고 답합니다.
 *
 * 응답을 캐시하지 않도록 막습니다 — 중간에 캐시가 끼면 죽은 뒤에도 200 이 남습니다.
 */
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');

  mysql.query('SELECT 1', (err) => {
    if (err) {
      logError('health', err);
      return res.status(503).json({ status: 'error', db: 'down' });
    }
    return res.json({ status: 'ok', db: 'up', uptime: Math.round(process.uptime()) });
  });
});

app.get("/search", (req, res) => {
  res.sendFile(nodePath.join(__dirname, "public", "search.html"));
});

// 시설 검색 조건·정렬 (테스트를 위해 분리했습니다)
const {
  keywordClause,
  keywordScoreExpr,
} = require('./search');

/**
 * 지도에 내려보낼 컬럼.
 *
 * 예전에는 `SELECT *` 였습니다. 표에는 16개가 있는데 화면이 읽는 것은 이 열 개뿐이라
 * 나머지 여섯이 매 요청 그냥 따라 나갔습니다.
 *
 *   mgtno·lastmodts·apvpermymd·dcbymd  적재·동기화용입니다 (scripts/syncData.js).
 *                                      클라이언트 참조 0곳.
 *   x·y                                원본 TM 좌표(EPSG:5181). 화면은 받자마자
 *                                      lat/lng 로 덮어씁니다 — 보내 봐야 버립니다
 *                                      (client/.../SearchMap.tsx 의 transformedResults).
 *
 * 서울 도심 300건으로 재면 139,598B → 96,764B (31%). 이 요청 하나가 전체 전송량의
 * 65% 라 전체로는 20%가 줄어듭니다. (docs/LoadTest-2026-09-15.md)
 *
 * trdstatenm 은 지금 데이터에서 dtlstatenm 과 1:1 로 겹치지만(3만건 중 어긋나는 것 0건)
 * 남겨 둡니다. 우리가 만드는 값이 아니라 공공데이터 원본이라 언젠가 갈라질 수 있고,
 * 화면의 폐업 거르기가 둘 다 봅니다 (client/src/apis/place.api.ts 의 isClosed).
 *
 * 즐겨찾기도 같은 방식으로 골라 담습니다 (controller/favorites.js 의 getFavorites).
 */
const FACILITY_COLUMNS = [
  'id', 'bplcnm', 'type', 'sitewhladdr', 'rdnwhladdr',
  'sitetel', 'lat', 'lng', 'dtlstatenm', 'trdstatenm',
].join(', ');

app.get("/facilities", (req, res) => {
  const {
    type, keyword, swLat, swLng, neLat, neLng, onlyOpened, limit,
  } = req.query;
  let query = `SELECT ${FACILITY_COLUMNS} FROM medical_facilities WHERE 1=1`;
  const values = [];

  if (type) {
    query += " AND type = ?";
    values.push(type);
  }

  if (keyword) {
    query += keywordClause(keyword, values);
  }

  // 폐업 제외. 전국 3만건 중 약 1.2만건이 폐업이라 서버에서 걸러 전송량을 줄입니다.
  if (onlyOpened !== "false") {
    query += " AND (dtlstatenm IS NULL OR dtlstatenm <> '폐업')";
  }

  /*
   * 지도 화면 범위 조회.
   * 전국을 한 번에 내려주면 응답이 13MB 를 넘고 클라이언트가 마커를 2만개 그리게 됩니다.
   * 네 값이 모두 오면 보이는 영역만 내려줍니다. (lat/lng 는 적재 시 미리 계산해 인덱스가 걸려 있음)
   */
  const bounds = [swLat, swLng, neLat, neLng].map(Number);
  const hasBounds = bounds.every((n) => Number.isFinite(n));

  if (hasBounds) {
    const [s, w, n, e] = bounds;
    query += " AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?";
    values.push(Math.min(s, n), Math.max(s, n), Math.min(w, e), Math.max(w, e));
  }

  // 좌표가 없는 레코드는 지도에 찍을 수 없어 범위 조회에서는 제외합니다.
  if (hasBounds) {
    query += " AND lat IS NOT NULL AND lng IS NOT NULL";
  }

  /*
   * 건수 상한.
   * 클라이언트가 마커를 그리는 화면에서는 limit 을 넘겨 받습니다.
   * 한 번에 2만개를 넘기면 지도 클러스터러가 스택 오버플로로 죽습니다.
   */
  const maxLimit = Number(process.env.FACILITIES_LIMIT) || 50000;
  const asked = Number(limit);
  const rowLimit = Number.isFinite(asked) && asked > 0
    ? Math.min(Math.floor(asked), maxLimit)
    : maxLimit;

  /*
   * 정렬. 검색어가 있으면 적합도가 먼저이고, 그다음이 화면 중심에서 가까운 순입니다.
   *
   * 적합도를 앞에 두는 이유: 화면은 결과의 첫 줄로 지도를 옮깁니다. 상호에 글자만
   * 순서대로 맞은 느슨한 결과가 첫 줄에 오면 엉뚱한 곳으로 가버립니다.
   *
   * 거리순이 필요한 이유: ORDER BY 가 없으면 MySQL 이 임의 순서(인덱스 스캔 순서)로
   * limit 만큼 잘라냅니다. lat 인덱스를 타면 남쪽(제주·부산) 데이터부터 채워져,
   * 줌을 넓게 잡으면 지도 중앙(예: 세종)의 시설이 통째로 빠지는 문제가 있었습니다.
   * 잘려나갈 때 최소한 화면 중앙에 가까운 것부터 남도록 합니다.
   *
   * ORDER BY 의 바인딩 값은 WHERE 것들보다 뒤에 와야 해서 따로 모았다가 마지막에 붙입니다.
   */
  const orderParts = [];
  const orderValues = [];

  if (keyword) {
    const score = keywordScoreExpr(keyword, orderValues);
    if (score) orderParts.push(`${score} DESC`);
  }

  if (hasBounds) {
    const [s2, w2, n2, e2] = bounds;
    orderParts.push('(POW(lat - ?, 2) + POW(lng - ?, 2)) ASC');
    orderValues.push((s2 + n2) / 2, (w2 + e2) / 2);
  }

  if (orderParts.length > 0) {
    query += ` ORDER BY ${orderParts.join(', ')}`;
    values.push(...orderValues);
  }

  query += ` LIMIT ${rowLimit}`;

  /*
   * 쿼리와 값은 찍지 않습니다. 검색어가 그대로 남는 데다, 매 요청마다
   * 3만건짜리 표를 훑는 SQL 전문이 로그를 가득 채웁니다.
   */

  mysql.query(query, values, (err, results) => {
    if (err) {
      logError('search', err);
      return res.status(500).json({ message: '서버 오류 발생' });
    }

    res.json(results);
  });
});

/**
 * 화면 범위의 시설을 격자로 묶어 개수만 내려줍니다.
 *
 * 개별 레코드를 limit 으로 잘라 보내면, 잘려나간 지역은 지도에 아무것도 안 뜹니다.
 * (세종시 동물병원 43곳이 통째로 빠지던 문제)
 * 줌이 넓을 때는 원본 대신 격자별 집계를 보내 화면 전체를 빠짐없이 덮습니다.
 *
 * precision 은 격자 크기를 정하는 소수점 자리수입니다.
 *   0 -> 약 111km, 1 -> 약 11km, 2 -> 약 1.1km
 */
app.get("/facilities/clusters", (req, res) => {
  const { type, keyword, swLat, swLng, neLat, neLng, onlyOpened, precision } =
    req.query;

  const bounds = [swLat, swLng, neLat, neLng].map(Number);
  if (!bounds.every((n) => Number.isFinite(n))) {
    return res
      .status(400)
      .json({ message: "swLat, swLng, neLat, neLng 가 모두 필요합니다." });
  }

  // 0~3 으로 제한. 그 이상은 격자가 너무 촘촘해 집계 의미가 없습니다.
  const asked = Number(precision);
  const digits = Number.isFinite(asked) ? Math.min(Math.max(Math.floor(asked), 0), 3) : 1;

  const values = [];
  let where = "lat IS NOT NULL AND lng IS NOT NULL";

  const [s, w, n, e] = bounds;
  where += " AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?";
  values.push(Math.min(s, n), Math.max(s, n), Math.min(w, e), Math.max(w, e));

  if (type) {
    where += " AND type = ?";
    values.push(type);
  }

  if (keyword) {
    where += keywordClause(keyword, values);
  }

  if (onlyOpened !== "false") {
    where += " AND (dtlstatenm IS NULL OR dtlstatenm <> '폐업')";
  }

  /*
   * 격자 중심 대신 격자 안 시설들의 평균 좌표를 씁니다.
   * 격자 중심에 찍으면 바다나 산 위에 풍선이 뜨는 경우가 생깁니다.
   */
  const query =
    `SELECT
       ROUND(lat, ${digits}) AS cellLat,
       ROUND(lng, ${digits}) AS cellLng,
       COUNT(*) AS count,
       SUM(type = '병원') AS hospitalCount,
       SUM(type = '약국') AS pharmacyCount,
       AVG(lat) AS lat,
       AVG(lng) AS lng
     FROM medical_facilities
     WHERE ${where}
     GROUP BY cellLat, cellLng
     ORDER BY count DESC`;

  mysql.query(query, values, (err, results) => {
    if (err) {
      logError('cluster', err);
      return res
        .status(500)
        .json({ message: '서버 오류 발생' });
    }

    res.json(
      results.map((row) => ({
        lat: Number(row.lat),
        lng: Number(row.lng),
        count: Number(row.count),
        hospitalCount: Number(row.hospitalCount),
        pharmacyCount: Number(row.pharmacyCount),
      }))
    );
  });
});


/*
 * 거둬들인 토큰 끊기.
 *
 * 비밀번호를 바꾸거나 탈퇴하면 users.token_version 이 올라가고, 그 전에 나간
 * 토큰은 여기서 401 이 됩니다 (middleware/tokenVersion.js).
 *
 * 자리가 여기인 이유: 위의 /facilities·/facilities/clusters·/health 는 토큰 없이
 * 도는 길이고 이 서버에서 제일 자주 불립니다. 그 뒤에 붙여 두면 그 요청들은
 * 아예 지나갑니다. 아래 라우터들 중 인증이 필요한 것만 조회 한 번을 더 씁니다.
 */
const { revokeStaleTokens } = require('./middleware/tokenVersion');
app.use(revokeStaleTokens);

// 라우터 설정
const categoryRouter = require('./routes/category');
const postRouter = require('./routes/post');
const reviewRouter = require('./routes/review');
const commentRouter = require('./routes/comment');
const authRouter = require('./routes/auth');
const mypageRouter = require('./routes/mypage');
const petsRouter = require('./routes/pets');
const favoritesRouter = require('./routes/favorites');
const pushRouter = require('./routes/push');
const emoticonRouter = require('./routes/emoticon');

app.use('/category', categoryRouter);
app.use('/posts', postRouter);
app.use('/reviews', reviewRouter);
app.use('/comments', commentRouter);
app.use('/auth', authRouter);
app.use('/mypage', mypageRouter);
app.use('/pets', petsRouter);
app.use('/favorites', favoritesRouter);
app.use('/push', pushRouter);
/*
 * 그림을 내려주는 /emoticons/:id/image 는 토큰 없이 <img> 가 부르는 길이라,
 * 위의 revokeStaleTokens 는 Authorization 헤더가 없는 것을 보고 바로 지나갑니다.
 * 등록·삭제는 토큰을 들고 오므로 거둬들인 토큰 검사를 그대로 거칩니다.
 */
app.use('/emoticons', emoticonRouter);

/*
 * 어느 라우트에도 걸리지 않은 주소.
 * 이게 없으면 Express 기본 처리로 넘어가 HTML 이 돌아옵니다. 화면은 JSON 을
 * 기대하고 파싱하다 엉뚱한 곳에서 터집니다.
 */
app.use((req, res) => {
    res.status(404).json({ message: '요청한 주소를 찾을 수 없습니다.' });
});

/*
 * 어디서도 잡지 못한 오류의 마지막 그물.
 *
 * 기본 처리로 넘어가면 스택 트레이스가 그대로 화면까지 갑니다. 표 이름과 쿼리가
 * 드러나므로, 사람이 읽을 문구만 돌려주고 원인은 서버 로그에만 남깁니다.
 * 인자를 네 개 받아야 Express 가 오류 처리기로 알아봅니다.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    // 이미 응답이 나가기 시작했으면 손댈 수 없습니다. Express 기본 처리로 넘깁니다.
    if (res.headersSent) return next(err);

    /*
     * 본문이 상한(위의 3mb)을 넘은 경우입니다.
     *
     * 사진을 여러 장 붙인 글에서 실제로 납니다. 500 "서버 오류 발생" 으로 답하면
     * 사용자는 원인을 몰라 같은 버튼을 계속 누릅니다. 무엇을 줄여야 하는지 알려줍니다.
     */
    if (err?.type === 'entity.too.large') {
        return res.status(413).json({
            message: '내용이 너무 큽니다. 사진 수를 줄이거나 크기가 작은 사진을 써주세요.',
        });
    }

    /*
     * 본문이 JSON 이 아닌 경우. 화면의 잘못이지 서버 문제가 아니라 400 으로 답합니다.
     * 500 으로 두면 서버 장애로 오인해 원인을 엉뚱한 데서 찾게 됩니다.
     */
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ message: '요청 형식이 올바르지 않습니다.' });
    }

    logError('unhandled', err);
    return res.status(500).json({ message: '서버 오류 발생' });
});

/*
 * 접종·검진 알림 배치.
 *
 * REMINDER_CRON 이 있을 때만 돕니다. 기본은 꺼짐입니다 — 개발하면서 서버를 켤
 * 때마다 진짜 알림이 나가면 안 됩니다. 운영에서는 server/.env 에 '0 9 * * *'
 * 처럼 넣습니다.
 *
 * 시각은 컨테이너의 시간대를 따릅니다. docker-compose 의 api 에 TZ 가 없으면
 * UTC 로 잡혀 한국 오후 6시에 나갑니다.
 *
 * 앱을 여러 개 띄워도 vaccination_reminders 의 기본키가 중복 발송을 막으므로
 * 인스턴스마다 걸어도 같은 알림이 두 번 가지 않습니다.
 */
if (process.env.REMINDER_CRON) {
  const cron = require('node-cron');
  const { execFile } = require('child_process');

  if (!cron.validate(process.env.REMINDER_CRON)) {
    logError('reminder:cron', new Error('REMINDER_CRON 형식이 올바르지 않습니다.'));
  } else {
    cron.schedule(process.env.REMINDER_CRON, () => {
      /*
       * 같은 프로세스에서 돌리지 않고 따로 띄웁니다. 발송이 오래 걸리거나 죽어도
       * API 가 함께 멈추지 않고, 손으로 돌릴 때와 똑같은 경로를 탑니다.
       */
      execFile(
        process.execPath,
        [nodePath.join(__dirname, 'scripts', 'sendReminders.js'), '--send', '--summary-only'],
        (error, stdout) => {
          if (error) return logError('reminder:run', error);
          console.log(stdout.trim());
        }
      );
    });
    console.log(`접종 알림 배치 예약됨: ${process.env.REMINDER_CRON}`);
  }
}

/*
 * 후기 AI 요약이 켜져 있는지 한 줄 남깁니다. 키가 없으면 조용히 꺼지는 기능이라,
 * 이 줄이 없으면 "왜 요약이 안 나오지" 를 코드까지 들어가 봐야 압니다. 키 값은 찍지 않습니다.
 */
console.log(`후기 AI 요약: ${require('./ai').describe()}`);

// 서버 시작
const server = app.listen(port, () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});

/*
 * 정상 종료.
 *
 * docker stop 과 대부분의 배포 도구는 SIGTERM 을 보내고 10초쯤 기다렸다가
 * 강제로 죽입니다. 아무 처리도 하지 않으면 그 순간 처리 중이던 요청이 끊기고,
 * 배포할 때마다 몇 건은 오류로 끝납니다.
 *
 * 새 요청을 받지 않고, 돌고 있는 것을 마친 뒤, DB 풀을 닫고 나갑니다.
 */
const SHUTDOWN_TIMEOUT_MS = 10_000;

const shutdown = (signal) => {
  console.log(`${signal} 수신, 종료합니다.`);

  // 시간 안에 끝나지 않으면 그냥 나갑니다. 여기서 멈춰 있으면 배포가 막힙니다.
  const forceExit = setTimeout(() => {
    console.error('제때 끝내지 못해 강제로 종료합니다.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close(() => {
    mysql.end((error) => {
      if (error) logError('shutdown', error);
      process.exit(0);
    });
  });
};

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});