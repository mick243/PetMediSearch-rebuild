# 백엔드 재설계 — 이어받기 (2026-09-28)

다른 모델·세션이 이 작업을 이어받을 때 **맨 먼저 읽는 문서**입니다. 규칙은 저장소 루트의
`AGENTS.md`(Claude 는 `CLAUDE.md`, 내용 같음), 계획 전체는 `docs/Backend-Rebuild-Plan-2026-09-28.md`
에 있습니다. 이 문서는 "지금 어디까지 왔고 다음에 무엇을 하나" 만 적습니다.

## 1. 맡은 일

사용자가 받은 피드백 세 가지를 적용합니다. 사용자가 정한 것은 아래와 같습니다(다시 묻지 않습니다).

| 항목 | 정한 것 |
|---|---|
| Prisma 도입 · CRUD 레이어 | **Prisma 7 + 서버를 TypeScript(ESM)로** |
| 데이터 마이그레이션 | Prisma Migrate 기준선 + 기준 데이터와 시드를 나눠 관리 |
| 토큰 최적화(쪽 나누기) | **둘 다** — API 응답의 쪽 나누기와 AI 후기 요약의 입력 토큰 |
| 진행 방식 | **단계마다 PR**. 앞 단계 위에 쌓습니다 |

## 2. 지금 상태

| 단계 | 브랜치 | PR | 상태 |
|---|---|---|---|
| 보안 3·4·5 | `claude/security-input-db-ratelimit` | #10 | ✅ main 에 병합(a322173) |
| 0 응답 기준선 | `claude/prisma-0-contract-baseline` | #11 | 열림 · CI 6/6 통과 · **사용자 병합 대기** |
| 1 TypeScript·ESM | `claude/prisma-1-typescript` (#11 위) | #12 | 열림 · CI 6/6 통과 · 기준선 82/82 · **병합 대기** |
| 2 Prisma 기반 | `claude/prisma-2-foundation` (#12 위) | #13 | 열림 · 기준선 82/82 · migrate diff 0 · **병합 대기** |
| 3~6 | — | — | 시작 전 |

작업 위치는 워크트리 `.claude/worktrees/mobile-board-ui-improvements-f99327` 입니다. 이 워크트리의
`server/node_modules` 는 **다른 워크트리와 연결되지 않은 독립 폴더**입니다(아래 5장).

### 2단계에서 한 것 (PR #13)

- `db/prisma.ts` — PrismaClient 하나. 어댑터 `@prisma/adapter-mariadb`, `initSql` 로 세션 UTC,
  `PRISMA_POOL_SIZE`(기본 5), 전역 omit(`review.images` · `emoticon.data` · `pet.photo` · `user.password`).
- `db/format.ts` (+ 테스트) — TIMESTAMP → KST 문자열, DATE · TIME · DECIMAL(scale) · Boolean → 0/1 ·
  FacilityType → '병원'/'약국'.
- `logError.ts` — Prisma 오류는 name · code · meta 의 모델 · 필드 이름만 찍습니다(테스트 있음).
- 시범 모듈 옮김: `repositories/favorites.ts` · `repositories/mypage.ts`. 컨트롤러는 HTTP 만 다룹니다.
  마이페이지 후기의 `image_count` 는 `$queryRaw`(JSON_LENGTH) + `Number()`.
- `prisma/migrations/0_init/migration.sql` — DDL 전체 + 분류 9개(id 명시). 예시 계정 1~6 은 `prisma/seed.ts`.
- `contract/db.ts` — 마이그레이션 파일을 차례로 적용한 뒤 시드 · 고정 데이터를 넣습니다.
- `prisma.config.ts` — root 접속 URL 을 `DB_*` · `DB_ROOT_*` 로 만듦(암호 `encodeURIComponent`).
  그림자 DB 는 `<DB_NAME>_shadow`(`SHADOW_DATABASE_URL` 로 바꿀 수 있음). **Prisma 가 만들어 주지 않으니
  먼저 만듭니다** — CI 는 컨테이너에 `CREATE DATABASE` 를 하고 돕니다.
- npm 스크립트: `generate`, `build` · `typecheck` · `test` 앞에 `prisma generate`, `migrate:diff`.
  CI contract 작업에 migrate diff 단계 추가.
- `schema.prisma` 의 `emoticons.content_hash` 는 **기본값 없는 필수 문자열**로 둡니다. `@default(dbgenerated())`
  를 달면 migrate diff 가 차이로 잡습니다. 그래서 이모티콘 INSERT 는 3단계에서도 raw SQL 로 남깁니다.
- 앱 종료(SIGTERM)에서 mysql2 풀과 Prisma 둘 다 닫습니다.

### 2단계에서 잰 사실 (다시 재지 않아도 됩니다)

어댑터로 기준선 DB 를 읽어 본 결과입니다.

| 값 | 어댑터 기본(세션 +09:00) | 세션 UTC | 지금 API 응답 |
|---|---|---|---|
| 글 작성 시각(TIMESTAMP, KST 10:00) | `10:00Z` — **9시간 어긋남** | `01:00Z` — 정확 | `'2026-09-05 10:00:00'` |
| 생일(DATE) | `2020-05-01T00:00Z` | 같음 | `'2020-05-01'` |
| 예약 시각(TIME) | `1970-01-01T10:30Z` | 같음 | `'10:30:00'` |
| 몸무게(DECIMAL(5,2)) | `"3.2"` | 같음 | `"3.20"` |
| 완료(tinyint(1)) | `false` | 같음 | `0` |

그래서 정한 것:
- 어댑터 접속은 `initSql: ["SET time_zone = '+00:00'"]` 로 세션을 UTC 로 못박습니다.
- 응답은 변환 층에서 지금과 똑같은 모양으로 만듭니다.
  - TIMESTAMP 는 KST 벽시계 `'YYYY-MM-DD HH:MM:SS'`
  - DATE 는 `'YYYY-MM-DD'`, TIME 은 `'HH:MM:SS'`
  - DECIMAL 은 컬럼 자릿수 그대로 `toFixed(scale)`
  - Boolean 은 `0`/`1`
  - FacilityType 은 `'병원'`/`'약국'`

## 3. 다음에 할 일

### 2단계 뒤 곧바로

1. PR #11 → #12 → #13 이 병합되면 3단계 브랜치 `claude/prisma-3-modules` 를 main 위에 만듭니다.
2. 3단계 첫 모듈은 글(`controller/post.ts` · `category.ts`)입니다. 즐겨찾기 · 마이페이지가 본보기입니다:
   저장소 함수는 mysql2 때와 같은 키 이름 · 순서 · 타입을 돌려주고(`db/format.ts`), 컨트롤러는 토큰 · 검사 · 응답만.
3. 모듈마다 `npm run test:contract` 82/82 를 지키고, 한 모듈씩 커밋합니다.

### 3~6단계 (계획서 표 그대로)

- **3 모듈 이행**
  - 순서: 글 · 댓글 · 후기 → 계정 → 반려동물 · 푸시 · 이모티콘 · 요약.
  - 재귀 CTE, 지도 검색 · 격자, INSERT…SELECT, 이모티콘 번호 당기기는 raw SQL 로 남깁니다.
  - 탈퇴(6문장) · 글 삭제 · 댓글 삭제는 트랜잭션으로 묶습니다.
  - 모듈마다 기준선을 통과시킵니다. 다 옮기면 `mysql.ts` 풀을 지웁니다.
- **4 데이터 원천**
  - compose 의 초기화를 `createTables.sql` 에서 `prisma migrate deploy` + 기준 데이터로 바꿉니다.
  - 시설 적재(`syncData.ts`)는 실행 기록 표를 남깁니다.
- **5 API 쪽 나누기**
  - 즐겨찾기 · 반려동물(사진 포함) · 마이페이지 · 이모티콘 목록을 쪽으로 나눕니다.
  - `/facilities` 의 기본 5만 건을 줄입니다.
  - 응답이 **일부러** 바뀌므로 화면(client)도 같이 고치고, 기준선을 다시 떠 이유를 PR 에 적습니다.
- **6 AI 요약 토큰**
  - 지금은 최근 후기 30건(최악 약 6만 자)을 한 번에 보냅니다.
  - 쪽 단위로 나눠 요약을 이어 붙이고, 호출마다 입력·출력 토큰 수를 남겨 전후를 잽니다.

## 4. 확인하는 법

응답 기준선은 **전용 컨테이너**에서만 돕니다. 공유 개발 DB(3306, `petmedisearch-mysql`)에는 대지 않습니다.

```bash
docker run -d --name pms-contract-mysql -p 127.0.0.1:3307:3306 -e MYSQL_ROOT_PASSWORD=<새로 만든 암호> mysql:8 --default-time-zone=+09:00
```

```bash
cd server && CONTRACT_DB_HOST=127.0.0.1 CONTRACT_DB_PORT=3307 CONTRACT_DB_PASSWORD=<그 암호> npm run test:contract
```

- 이 기계의 `mysql:8` 이미지는 8.4.11 입니다(CI 와 같은 판). 새로 받을 필요가 없습니다.
- 초기화가 끝날 때까지 20초쯤 걸립니다. `contract/db.ts` 가 30초까지 다시 붙어 봅니다.
- 끝나면 `docker rm -f -v pms-contract-mysql` 로 지웁니다.
- 마이그레이션 ↔ 스키마 차이: 같은 컨테이너에 그림자 DB 를 만들고 돕니다.
  `docker exec pms-contract-mysql mysql -uroot -p<암호> -e 'CREATE DATABASE petmedisearch_ci_shadow'` 뒤
  `DB_HOST=127.0.0.1 DB_PORT=3307 DB_NAME=petmedisearch_ci DB_ROOT_PASSWORD=<암호> npm run migrate:diff` (exit 0 이어야 함).
- 그 밖: `npm run typecheck` · `npm run lint` · `npm test`(DB 없음) · `npm run build`. 셋 다 `prisma generate` 를 먼저 돕니다.

## 5. 이 환경에서 당한 것 (다시 당하지 않게)

- **파일이 CRLF 입니다.** `\n` 으로 찾아 바꾸는 스크립트는 여러 줄 패턴에서 조용히 실패합니다. 한 줄 패턴을 쓰거나 편집 도구로 고칩니다.
- **npm 11 은 설치 스크립트를 막습니다**(`allow-scripts` 경고).
  - 새로 `npm ci` 하면 bcrypt 네이티브 모듈이 빠져 런타임에 깨집니다.
  - 이 워크트리의 `node_modules` 는 빌드된 것을 복사해 독립시켰습니다. 의존성을 더할 때는 그냥 `npm install` 하면 되고, bcrypt 는 그대로 남습니다.
- **연결(정션)된 `node_modules` 에서 `npm install` 을 하면** npm 이 링크를 실제 폴더로 바꿔 새로 깝니다. 다른 워크트리는 안전하지만 이 워크트리의 네이티브 모듈이 빠집니다.
- **TypeScript 는 6.0.3 입니다.** 7.0 은 typescript-eslint(8.70, `<6.1`)가 아직 받지 않습니다.
- **Prisma 7 은 ESM 전용**이고 `tinyint(1)` 을 Boolean 으로, DECIMAL 을 뒷자리 0 없이 돌려줍니다(2장 표).
- **TypedSQL** 은 생성할 때 DB 연결이 필요하고, MySQL 에서는 `IN (?)` 배열 인자를 못 씁니다. 지금은 쓰지 않고 `$queryRaw` 로 둡니다.
- **기계 변환 스크립트**
  - 주석만 바꾸려다 실행 코드의 문자열까지 바꾼 일이 있었습니다(`'app.js'` → `'app.ts'`). 바꾼 줄 목록을 뽑아 코드 줄은 따로 봅니다.
  - `.query(` 뒤 줄바꿈을 먹은 일도 있어 되살렸습니다.

## 6. 사용자에게 물어볼 것 (정하지 않은 것)

- PR #11 · #12 · #13 병합 — 사용자가 합니다. 병합되면 3단계 브랜치를 main 위에 만듭니다.
- 공유 개발 DB 두 가지(지난 보안 작업의 남은 일):
  - 컨테이너가 3306 을 모든 주소에 엽니다. 127.0.0.1 로 다시 만들지 정해야 합니다(데이터는 이름 없는 볼륨에 있음).
  - root 암호를 바꾸고 앱 계정을 만들지 정해야 합니다. 워크트리마다 `server/.env` 도 바뀝니다.
- 운영 이미지 빌드 확인 — `node:22-slim` 을 새로 받아야 해서 사용자 허락이 필요합니다.

## 7. 하지 않는 것

- 공유 개발 DB 에 쓰기, 스키마 적용, 컨테이너 재생성 — 사용자가 정하기 전에는 하지 않습니다.
- 응답의 키 이름·타입 바꾸기 — 5 · 6단계처럼 일부러 바꾸는 단계에서만, 이유를 적고 합니다.
- 보안 작업에서 공격을 재현하는 스크립트나 우회 입력을 만들기. 고친 것은 단위 테스트와 정상 요청으로 확인합니다(AGENTS.md §1.6).
