require('dotenv').config();
const express = require("express");
const mysql = require("./mysql");
const nodePath = require("path");
const cors = require("cors");

const app = express();
const port = 8080;

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
  const { type, keyword } = req.query;
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

  query += " LIMIT 10000";

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