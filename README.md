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

`server/.env` 를 열어 최소한 아래를 채웁니다. 나머지 항목의 설명은 파일 안에
있습니다.

- `DB_PASSWORD` · `DB_ROOT_PASSWORD` — 앱 계정(`DB_USER`)과 root 의 암호. 서로 다르게, 16자 이상 무작위로
- `JWT_SECRET` — `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- `CORS_ORIGIN` — 로컬이면 `http://localhost:5000`

카카오 지도 키는 `client/.env.local` 의 `VITE_KAKAO_MAP_KEY` 에 넣습니다.
비어 있으면 지도가 빈 화면으로 뜹니다.

### 2. DB

```bash
docker compose --env-file server/.env -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

`docker-compose.dev.yml` 은 호스트에서 띄운 서버가 닿도록 3306 을 **127.0.0.1 에만** 엽니다.
`docker run -p 3306:3306` 처럼 모든 주소에 열면 같은 와이파이·사내망의 누구나 DB 에 붙어 볼 수 있습니다.

앱 계정의 권한을 행 읽기·쓰기로 좁힙니다(`DB_ROOT_PASSWORD` 는 `server/.env` 에서 읽습니다).

```bash
cd server && npx tsx scripts/createDbUser.ts
```

처음 뜰 때 `server/scripts/` 의 스키마가 자동으로 적용됩니다.
이미 쓰던 DB 가 있다면 `server/scripts/alter*.sql` 을 파일 이름 순서대로 적용하세요.

> `.sql` 을 넣을 때 `--default-character-set=utf8mb4` 를 빼면 한글이 조용히
> 깨집니다. 각 파일 맨 위에 적용 명령이 적혀 있습니다.

### 3. 시설 데이터 적재

```bash
cd server && npx tsx scripts/importData.ts
```

### 4. 실행

```bash
cd server && npm install && npm run dev
```

```bash
cd client && npm install && npm run dev
```

`http://localhost:5000` 으로 들어갑니다.

### 관리자 계정

```bash
cd server && ADMIN_PASSWORD='고른-비밀번호' npm run create-admin
```

### 테스트

```bash
cd server && npm test
```

DB 없이 돕니다. 서버 내부를 바꿨다면 **응답 기준선**도 돌립니다 — 고정 데이터를 깐 전용
MySQL 에 앱을 띄워 81개 요청의 응답을 `server/contract/golden.json` 과 비교합니다.
돌리는 법과 기준선을 다시 뜨는 법은 `CLAUDE.md` §6.7 에 있습니다. CI 는 둘 다 돕니다.

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
| `DB_USER` · `DB_PASSWORD` | 앱 전용 계정. root 는 쓸 수 없습니다 |
| `DB_ROOT_PASSWORD` | DB 를 처음 만들 때의 root 암호. 앱 컨테이너에는 넘어가지 않습니다 |
| `TRUST_PROXY` | nginx 등 프록시 뒤에 둘 때만 `1` |

### 2. 띄우기

`docker compose` 에는 늘 `--env-file server/.env` 를 붙입니다. compose 파일의 `${DB_…}` 는
`server/.env` 가 아니라 셸이나 루트 `.env` 에서 읽혀, 빼면 "required variable … is missing" 으로 멈춥니다.

```bash
docker compose --env-file server/.env up -d
```

앱 계정의 권한을 행 읽기·쓰기로 좁힙니다. root 암호는 이 명령에만 넘깁니다.

```bash
docker compose --env-file server/.env run --rm -e DB_ROOT_PASSWORD='root-암호' api node dist/scripts/createDbUser.js
```

```bash
docker compose --env-file server/.env exec api node dist/scripts/importData.js
```

```bash
docker compose --env-file server/.env exec -e ADMIN_PASSWORD='고른-비밀번호' api node dist/scripts/createAdmin.js
```

### 3. 확인

```bash
curl http://localhost:8081/health
```

`{"status":"ok","db":"up"}` 가 나와야 합니다. 이 엔드포인트는 실제로 DB 에 쿼리를
던져 보고 답하므로, 프로세스만 떠 있고 DB 에 못 닿는 상태는 503 으로 구분됩니다.

### 남은 일 (이 저장소 밖)

- **HTTPS** — nginx·Caddy 를 같은 서버에 두고 `127.0.0.1:8081` 로 넘기거나, 플랫폼이
  제공하는 것을 씁니다. 붙인 뒤 `TRUST_PROXY=1` 을 켜세요. compose 는 API 를 127.0.0.1 에만
  열어서, 바깥에서는 그 프록시를 거쳐야만 닿습니다.
- **감시** — `/health` 를 주기적으로 찔러 실패하면 알리도록 걸어 둡니다.
  (UptimeRobot 같은 무료 도구로 충분합니다)
- **백업을 서버 밖으로** — 아래 백업은 같은 서버에 쌓입니다.

### 관리형 DB 를 쓴다면

`docker-compose.yml` 에서 `db` 서비스와 `depends_on` 을 지우고 `server/.env` 의
`DB_HOST`·`DB_USER`·`DB_PASSWORD` 만 그쪽으로 바꾸면 됩니다. `api` 서비스는 그대로
씁니다. 앱 계정은 그 DB 의 관리자 계정으로 `createDbUser.ts` 를 돌려 만듭니다
(`DB_ROOT_USER` 에 관리자 이름, `DB_ROOT_PASSWORD` 에 그 암호).

### 이미 띄워 둔 서버라면

예전 구성은 앱이 root 로 붙었고, root 암호가 곧 `DB_PASSWORD` 였습니다. 볼륨은 그대로 두고
계정만 바꿉니다.

1. `server/.env` 에 `DB_ROOT_PASSWORD=<지금의 DB_PASSWORD>` 를 더합니다.
2. `DB_USER=petmedisearch_app`, `DB_PASSWORD=<새로 만든 암호>` 로 바꿉니다.
3. 새 설정으로 계정을 만들고, API 를 다시 띄웁니다. `exec` 가 아니라 `run --rm` 인 이유는
   떠 있는 API 컨테이너가 아직 예전 설정을 들고 있어서입니다.

```bash
docker compose --env-file server/.env run --rm -e DB_ROOT_PASSWORD='지금-root-암호' api node dist/scripts/createDbUser.js
```

```bash
docker compose --env-file server/.env up -d
```

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
gunzip -c backups/petmedisearch-YYYYmmdd-HHMMSS.sql.gz | docker compose --env-file server/.env exec -T db mysql --default-character-set=utf8mb4 -uroot -p petmedisearch
```

### 시설 데이터 갱신

원본은 매일 갱신되며 2일 전 기준으로 현행화됩니다.

```bash
docker compose --env-file server/.env exec api node dist/scripts/syncData.js
```

주 1회 정도면 충분합니다. `crontab -e` 에:

```bash
0 5 * * 1 cd /path/to/PetMediSearch-rebuild && docker compose --env-file server/.env exec -T api node dist/scripts/syncData.js >> /var/log/pms-sync.log 2>&1
```

### 로그

```bash
docker compose --env-file server/.env logs -f api
```

로그에는 개인정보와 쿼리 본문을 남기지 않습니다. 오류는 `[맥락] 코드: 문구`
한 줄로 나옵니다.

---

## 알려진 한계

- 사진(반려동물·후기·글 본문)이 DB 안에 data URL 로 들어갑니다. 파일 서버가 없어
  택한 방식이고, 이용자가 늘면 파일 저장소로 옮겨야 합니다.
- 영업시간 데이터가 원본에 없어 "지금 문 연 병원"을 계산할 수 없습니다.
- 좌표가 없는 시설 124건은 지도에 표시되지 않습니다.
