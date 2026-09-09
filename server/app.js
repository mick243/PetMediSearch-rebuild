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
app.use(express.json());

// swagger 연동
const { swaggerUi, specs } = require("./swagger/swagger");
app.use("/api", swaggerUi.serve, swaggerUi.setup(specs));
app.use(express.static("public"));

app.get("/search", (req, res) => {
  res.sendFile(nodePath.join(__dirname, "public", "search.html"));
});

// 지도에 위치 표시 
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
    query += " AND (bplcnm LIKE ? OR rdnwhladdr LIKE ? OR sitewhladdr LIKE ?)";
    values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
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
   * 화면 중심에서 가까운 순으로 정렬.
   *
   * ORDER BY 가 없으면 MySQL 이 임의 순서(인덱스 스캔 순서)로 limit 만큼 잘라냅니다.
   * lat 인덱스를 타면 남쪽(제주·부산) 데이터부터 채워져, 줌을 넓게 잡으면
   * 지도 중앙(예: 세종)의 시설이 통째로 빠지는 문제가 있었습니다.
   * 잘려나갈 때 최소한 화면 중앙에 가까운 것부터 남도록 합니다.
   */
  if (hasBounds) {
    const [s2, w2, n2, e2] = bounds;
    const centerLat = (s2 + n2) / 2;
    const centerLng = (w2 + e2) / 2;
    query +=
      ' ORDER BY (POW(lat - ?, 2) + POW(lng - ?, 2)) ASC';
    values.push(centerLat, centerLng);
  }

  query += ` LIMIT ${rowLimit}`;

  console.log("Executing query:", query);
  console.log("Query values:", values);

  mysql.query(query, values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      return res.status(500).json({ error: 'Internal server error', details: err.message });
    }

    console.log(`Query returned ${results.length} results`);
    res.json(results);
  });
});

// 라우터 설정
const categoryRouter = require('./routes/category');
const postRouter = require('./routes/post');
const reviewRouter = require('./routes/review');
const commentRouter = require('./routes/comment');
const authRouter = require('./routes/auth');
const mypageRouter = require('./routes/mypage')

app.use('/category', categoryRouter);
app.use('/posts', postRouter);
app.use('/reviews', reviewRouter);
app.use('/comments', commentRouter);
app.use('/auth', authRouter);
app.use('/mypage', mypageRouter);

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});