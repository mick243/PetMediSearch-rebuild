require('dotenv').config();
const express = require("express");
const mysql = require("./mysql");
const nodePath = require("path");
const cors = require("cors");

const app = express();
const port = Number(process.env.PORT) || 8080;

console.log('Current directory:', __dirname);

// 미들웨어 설정
const allowedOrigins = (process.env.CORS_ORIGIN || "https://pet-medi-search.vercel.app")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
// 반려동물 사진은 축소된 JPEG 를 data URL 로 본문에 실어 보냅니다. 기본 100kb 로는 모자랍니다.
app.use(express.json({ limit: '3mb' }));

// swagger 연동
const { swaggerUi, specs } = require("./swagger/swagger");
app.use("/api", swaggerUi.serve, swaggerUi.setup(specs));
app.use(express.static("public"));

app.get("/search", (req, res) => {
  res.sendFile(nodePath.join(__dirname, "public", "search.html"));
});

// 지도에 위치 표시 
/**
 * 지역명 검색어를 실제 저장된 표기로 확장합니다.
 *
 * 주소는 공공데이터 원본 표기(예: "세종특별자치시")로 저장돼 있어서
 * 사람들이 흔히 쓰는 "세종시" 로는 LIKE 매칭이 되지 않았습니다.
 * ("세종"+"시" 가 연속되지 않으므로 부분 문자열로 잡히지 않음)
 */
const REGION_ALIASES = {
  '세종시': '세종특별자치시',
  '세종특별시': '세종특별자치시',
  '강원도': '강원특별자치도',
  '전라북도': '전북특별자치도',
  '전북도': '전북특별자치도',
  '제주도': '제주특별자치도',
  '제주시': '제주특별자치도 제주시',
};

/** 검색어를 [원본, 별칭] 형태로 확장합니다. 별칭이 없으면 원본만. */
function expandKeyword(keyword) {
  const trimmed = String(keyword).trim();
  const alias = REGION_ALIASES[trimmed];
  return alias ? [trimmed, alias] : [trimmed];
}

/** LIKE 의 와일드카드(% _ \)를 글자 그대로 찾도록 막습니다. */
function escapeLike(text) {
  return String(text).replace(/[\\%_]/g, '\\$&');
}

/** 검색어를 공백으로 나눕니다. "춘천 소망병원" -> ["춘천", "소망병원"] */
function tokenize(keyword) {
  return String(keyword).trim().split(/\s+/).filter(Boolean);
}

/**
 * 상호에서 중간 낱말이 빠진 경우를 잡는 느슨한 패턴.
 *
 * "소망병원" -> "%소%망%병%원%" 이 되어 "소망동물병원" 에 걸립니다.
 * 사람들이 "동물"·"의료재단" 같은 중간 낱말을 빼고 치기 때문에 필요합니다.
 * 한 글자짜리는 그냥 부분 문자열과 같아져서 만들지 않습니다.
 */
function loosePattern(token) {
  const chars = [...token];
  if (chars.length < 2) return null;
  return `%${chars.map(escapeLike).join('%')}%`;
}

/**
 * 검색 조건. 공백으로 나눈 토큰을 모두 만족해야 합니다(AND).
 *
 * 한 토큰은 둘 중 하나로 맞으면 통과합니다.
 *   1) 상호·주소 어딘가에 그대로 들어 있음   ("춘천" -> "강원특별자치도 춘천시 ...")
 *   2) 상호에 글자가 순서대로 들어 있음      ("소망병원" -> "소망동물병원")
 *
 * 2번은 느슨해서 상호에만 겁니다. 주소까지 열어주면 "강원" 이 "강...원" 으로
 * 엉뚱한 곳에 붙습니다. 주소는 행정구역이 붙어 있는 표기라 1번으로 충분합니다.
 * ("춘천" 은 "춘천시" 의 부분 문자열)
 */
function keywordClause(keyword, values) {
  const tokens = tokenize(keyword);
  if (tokens.length === 0) return '';

  const perToken = tokens.map((token) => {
    const parts = [];

    expandKeyword(token).forEach((variant) => {
      parts.push('(bplcnm LIKE ? OR rdnwhladdr LIKE ? OR sitewhladdr LIKE ?)');
      const like = `%${escapeLike(variant)}%`;
      values.push(like, like, like);
    });

    const loose = loosePattern(token);
    if (loose) {
      parts.push('bplcnm LIKE ?');
      values.push(loose);
    }

    return `(${parts.join(' OR ')})`;
  });

  return ` AND ${perToken.join(' AND ')}`;
}

/**
 * 검색 적합도. 큰 값이 먼저 옵니다.
 *
 * 느슨한 조건을 열어 준 만큼, 검색어가 상호에 그대로 들어 있는 쪽을 위로 올립니다.
 * 검색 결과의 첫 줄로 지도를 옮기기 때문에 순서가 곧 "어디로 가는지" 입니다.
 */
function keywordScoreExpr(keyword, values) {
  const tokens = tokenize(keyword);
  if (tokens.length === 0) return null;

  const parts = tokens.map((token) => {
    const like = `%${escapeLike(token)}%`;
    const loose = loosePattern(token);

    // 상호에 그대로 > 상호에 글자만 순서대로 > 주소에 그대로
    if (loose) {
      values.push(like, loose, like);
      return '(bplcnm LIKE ?) * 3 + (bplcnm LIKE ?) * 2 + (rdnwhladdr LIKE ?)';
    }
    values.push(like, like);
    return '(bplcnm LIKE ?) * 3 + (rdnwhladdr LIKE ?)';
  });

  return `(${parts.join(' + ')})`;
}

app.get("/facilities", (req, res) => {
  const {
    type, keyword, swLat, swLng, neLat, neLng, onlyOpened, limit,
  } = req.query;
  let query = "SELECT * FROM medical_facilities WHERE 1=1";
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

  console.log("Executing query:", query);
  console.log("Query values:", values);

  mysql.query(query, values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      return res.status(500).json({ message: '서버 오류 발생' });
    }

    console.log(`Query returned ${results.length} results`);
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
      console.error("Cluster query error:", err);
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


// 라우터 설정
const categoryRouter = require('./routes/category');
const postRouter = require('./routes/post');
const reviewRouter = require('./routes/review');
const commentRouter = require('./routes/comment');
const authRouter = require('./routes/auth');
const mypageRouter = require('./routes/mypage');
const petsRouter = require('./routes/pets');
const favoritesRouter = require('./routes/favorites');

app.use('/category', categoryRouter);
app.use('/posts', postRouter);
app.use('/reviews', reviewRouter);
app.use('/comments', commentRouter);
app.use('/auth', authRouter);
app.use('/mypage', mypageRouter);
app.use('/pets', petsRouter);
app.use('/favorites', favoritesRouter);

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
    console.error('처리되지 않은 오류:', err);
    // 이미 응답이 나가기 시작했으면 손댈 수 없습니다. Express 기본 처리로 넘깁니다.
    if (res.headersSent) return next(err);
    return res.status(500).json({ message: '서버 오류 발생' });
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});