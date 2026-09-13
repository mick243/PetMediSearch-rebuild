# PetMediSearch

전국 동물병원·동물약국을 지도에서 찾고, 후기와 글을 남기고, 반려동물의
접종·검진 일정을 챙기는 앱입니다.

| 구성 | 스택 | 포트 |
|---|---|---|
| `client/` | React 18 + TypeScript + Vite | 5000 |
| `server/` | Express + mysql2 | 8081 |
| DB | MySQL 8 | 3306 |

시설 데이터는 공공데이터포털(행정안전부 지방행정인허가데이터)에서 가져옵니다.
전국 31,493건(병원 20,872 / 약국 10,621)이며 좌표는 적재 시점에 WGS84 로 변환해
둡니다.

개발 규약은 [CLAUDE.md](CLAUDE.md) 에 있습니다.

---

## 로컬에서 띄우기

### 1. 설정 파일

```bash
cp server/.env.example server/.env
```

`server/.env` 를 열어 최소한 아래 셋을 채웁니다. 나머지 항목의 설명은 파일 안에
있습니다.

- `DB_PASSWORD`
- `JWT_SECRET` — `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- `CORS_ORIGIN` — 로컬이면 `http://localhost:5000`

카카오 지도 키는 `client/.env.local` 의 `VITE_KAKAO_MAP_KEY` 에 넣습니다.
비어 있으면 지도가 빈 화면으로 뜹니다.

### 2. DB

```bash
docker compose up -d db
```

처음 뜰 때 `server/scripts/` 의 스키마가 자동으로 적용됩니다.
이미 쓰던 DB 가 있다면 `server/scripts/alter*.sql` 을 파일 이름 순서대로 적용하세요.

> `.sql` 을 넣을 때 `--default-character-set=utf8mb4` 를 빼면 한글이 조용히
> 깨집니다. 각 파일 맨 위에 적용 명령이 적혀 있습니다.

### 3. 시설 데이터 적재

```bash
cd server && node scripts/importData.js
```

### 4. 실행

```bash
cd server && npm install && node app.js
```

```bash
cd client && npm install && npm run dev
```

`http://localhost:5000` 으로 들어갑니다.

### 관리자 계정

```bash
cd server && ADMIN_PASSWORD='고른-비밀번호' npm run create-admin
```

---

## 배포

`docker compose` 로 API 와 MySQL 을 한 서버에 띄우는 구성입니다. 화면(`client/`)은
Vercel 같은 정적 호스팅에 따로 올립니다.

### 1. 서버에서

```bash
git clone https://github.com/mick243/PetMediSearch-rebuild.git && cd PetMediSearch-rebuild
```

```bash
cp server/.env.example server/.env
```

운영용으로 바꿔야 하는 값:

| 항목 | 값 |
|---|---|
| `NODE_ENV` | `production` — Swagger(`/api`)가 닫힙니다 |
| `JWT_SECRET` | 새로 만든 값. 개발용과 같은 것을 쓰지 마세요 |
| `CORS_ORIGIN` | 실제 화면 주소 (`https://...`) |
| `URL`, `*_REDIRECT_URI` | 실제 주소. 각 소셜 제공자 콘솔에도 같은 값을 등록해야 합니다 |
| `TRUST_PROXY` | nginx 등 프록시 뒤에 둘 때만 `1` |

### 2. 띄우기

```bash
docker compose up -d
```

```bash
docker compose exec api node scripts/importData.js
```

```bash
docker compose exec -e ADMIN_PASSWORD='고른-비밀번호' api node scripts/createAdmin.js
```

### 3. 확인

```bash
curl http://localhost:8081/health
```

`{"status":"ok","db":"up"}` 가 나와야 합니다. 이 엔드포인트는 실제로 DB 에 쿼리를
던져 보고 답하므로, 프로세스만 떠 있고 DB 에 못 닿는 상태는 503 으로 구분됩니다.

### 남은 일 (이 저장소 밖)

- **HTTPS** — nginx·Caddy 를 앞에 두거나 플랫폼이 제공하는 것을 씁니다.
  붙인 뒤 `TRUST_PROXY=1` 을 켜세요.
- **감시** — `/health` 를 주기적으로 찔러 실패하면 알리도록 걸어 둡니다.
  (UptimeRobot 같은 무료 도구로 충분합니다)
- **백업을 서버 밖으로** — 아래 백업은 같은 서버에 쌓입니다.

### 관리형 DB 를 쓴다면

`docker-compose.yml` 에서 `db` 서비스와 `depends_on` 을 지우고 `server/.env` 의
`DB_HOST`·`DB_USER`·`DB_PASSWORD` 만 그쪽으로 바꾸면 됩니다. `api` 서비스는 그대로
씁니다.

---

## 운영

### 백업

```bash
sh server/scripts/backup.sh
```

`backups/` 에 날짜가 붙은 `.sql.gz` 로 쌓이고 14일이 지난 것은 지웁니다.
매일 새벽 4시에 돌리려면 `crontab -e` 에:

```bash
0 4 * * * cd /path/to/PetMediSearch-rebuild && sh server/scripts/backup.sh >> /var/log/pms-backup.log 2>&1
```

되돌리기:

```bash
gunzip -c backups/petmedisearch-YYYYmmdd-HHMMSS.sql.gz | docker compose exec -T db mysql --default-character-set=utf8mb4 -uroot -p petmedisearch
```

### 시설 데이터 갱신

원본은 매일 갱신되며 2일 전 기준으로 현행화됩니다.

```bash
docker compose exec api node scripts/syncData.js
```

주 1회 정도면 충분합니다. `crontab -e` 에:

```bash
0 5 * * 1 cd /path/to/PetMediSearch-rebuild && docker compose exec -T api node scripts/syncData.js >> /var/log/pms-sync.log 2>&1
```

### 로그

```bash
docker compose logs -f api
```

로그에는 개인정보와 쿼리 본문을 남기지 않습니다. 오류는 `[맥락] 코드: 문구`
한 줄로 나옵니다.

---

## 알려진 한계

- 사진(반려동물·후기·글 본문)이 DB 안에 data URL 로 들어갑니다. 파일 서버가 없어
  택한 방식이고, 이용자가 늘면 파일 저장소로 옮겨야 합니다.
- 영업시간 데이터가 원본에 없어 "지금 문 연 병원"을 계산할 수 없습니다.
- 좌표가 없는 시설 124건은 지도에 표시되지 않습니다.
