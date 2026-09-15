# 부하 시험 (k6)

동시 사용자 200명까지 걸어 보고, 화면별로 얼마나 기다리게 되는지 잽니다.

`server/scripts/seedScale.js` 가 만든 **사본 DB** 에 대고 돕니다. 실제 DB 는 글이
몇 건뿐이라 거기서 재면 어떤 쿼리도 빠릅니다 — 무엇이 문제인지 드러나지 않습니다.

| 파일 | 하는 일 |
|---|---|
| `k6/smoke.js` | 사용자 한 명으로 모든 경로를 한 번씩. 응답이 맞는지 + 혼자일 때의 기준값 |
| `k6/load.js` | 0 → 50 → 100 → 200 VU 로 올리며 10분 30초 |
| `k6/lib/app.js` | 대상 주소·사용자 여정·화면별 예산 |
| `k6/lib/summary.js` | 결과를 화면별 표로 |
| `../server/scripts/loadtestPrepare.js` | 계정·토큰·두드릴 id 만들기 |
| `../server/scripts/loadtestCleanup.js` | 시험이 남긴 것 되돌리기 |

준비·정리 스크립트만 `server/scripts/` 에 있는 것은 `mysql2`·`bcrypt` 를 쓰기 때문입니다
(`seedScale.js` 옆자리). k6 스크립트는 k6 가 자기 런타임으로 돌려서 `node_modules` 가
필요 없습니다.

---

## 처음 한 번

### 1. 사본 DB 만들기

```bash
docker exec petmedisearch-mysql mysql -uroot --password=<암호> -e "CREATE DATABASE IF NOT EXISTS petmedisearch_scale"
```

스키마를 실제 DB 와 맞춰 둡니다. 어긋나면 잰 값이 아니라 `Unknown column` 오류를
보게 됩니다 (실제로 `pet_vaccinations.due_time` 이 빠져 `/pets` 가 전부 500 이었습니다).

```bash
cd server
docker exec petmedisearch-mysql mysqldump -uroot --password=<암호> --no-data petmedisearch | docker exec -i petmedisearch-mysql mysql -uroot --password=<암호> petmedisearch_scale
```

### 2. 실규모 데이터 넣기

```bash
cd server && SCALE_DB=petmedisearch_scale node scripts/seedScale.js
```

사용자 1만 · 글 2만 · 댓글 6만 · 후기 1.5만 · 아이 6천 · 접종 일정 3만.
1분이 채 안 걸립니다.

---

## 돌릴 때마다

### 1. 서버 띄우기

```bash
cd server && DB_NAME=petmedisearch_scale TRUST_PROXY=1 NODE_ENV=production node app.js
```

`TRUST_PROXY=1` 이 **꼭 필요합니다.** 없으면 VU 200개가 전부 `::1` 한 사람으로 묶여,
1분에 300번 상한에 30초 만에 걸립니다. 그 뒤로는 서버 성능이 아니라
`express-rate-limit` 이 429 를 얼마나 빨리 돌려주는지를 재게 됩니다.
k6 가 VU 마다 다른 `X-Forwarded-For` 를 붙이므로, 이 설정이 있어야 VU 하나가
사용자 한 명으로 셉니다. 운영도 프록시 뒤에 있어 같은 경로를 탑니다.

`DB_NAME` 은 `.env` 보다 우선합니다 (dotenv 는 이미 있는 환경변수를 덮지 않습니다).

### 2. 준비물 만들기

```bash
cd server && SCALE_DB=petmedisearch_scale node scripts/loadtestPrepare.js
```

`loadtest/.data/` 에 계정 400개(토큰 포함)와 두드릴 id 목록이 생깁니다.
**실제로 통하는 JWT 가 들어 있어 커밋하면 안 됩니다** — `.gitignore` 에 있습니다.

### 3. 돌리기

**반드시 저장소 최상위에서** 돕니다. 결과 파일 경로가 `loadtest/results/...` 로
잡혀 있어서입니다.

```bash
k6 run loadtest/k6/smoke.js
```

```bash
k6 run loadtest/k6/load.js
```

다른 곳의 서버에 걸려면:

```bash
k6 run -e BASE_URL=http://10.0.0.5:8081 loadtest/k6/load.js
```

### 4. 되돌리기

```bash
cd server && SCALE_DB=petmedisearch_scale node scripts/loadtestCleanup.js
```

쓰기 시나리오가 남긴 댓글·후기를 지우고, 바꿔 둔 비밀번호를 원래 값으로 돌립니다.
지우는 기준은 k6 가 본문 앞에 붙인 `[k6]` 표시뿐입니다 — 기간이나 user_id 로
지우면 남의 것까지 날아갑니다.

---

## 무엇을 어떤 비율로 두드리나

사람이 실제로 하는 비율에 맞춥니다. 한 화면만 반복해 두드리면 그 화면은 빨라
보이는데(버퍼 풀에 다 올라가 있어서) 정작 같이 몰렸을 때가 어떤지는 모릅니다.

| 여정 | 비중 | 지나가는 곳 |
|---|---|---|
| 지도에서 병원 찾기 | 45% | `/facilities/clusters` → `/facilities` → `/reviews/facility/:id` → `/reviews/:id/images` |
| 커뮤니티 읽기 | 30% | `/category` → `/category?category=` → `/posts/:id` → `/comments/:id` |
| 마이페이지 | 15% | `/mypage/*` · `/favorites` · `/pets` (인증) |
| 로그인 | 6% | `/auth/login` (bcrypt cost 12) |
| 글 남기기 | 4% | `/comments` · `/reviews` (인증) |

열 번에 두 번은 **제일 무거운 쪽**을 고릅니다 — 후기 200건이 몰린 시설, 댓글 300건이
달린 글. 평균적인 글만 두드리면 문제가 나는 자리를 지나칩니다.

요청 사이에는 0.3~4초를 쉽니다. 이게 없으면 사용자가 아니라 스크래퍼를 흉내 내게 됩니다.

---

## 결과 읽는 법

화면별로 p50·p95·최대와 **예산**(`k6/lib/app.js` 의 `BUDGET_MS`)을 나란히 찍습니다.

```
화면                        건수     p50     p95       최대      예산  판정
clusters                    1892      41     118      380     1500  OK
```

- **예산을 넘긴 화면** 이 맨 아래에 따로 모입니다. 전체 p95 한 줄만 보면 무거운
  화면 하나가 묻힙니다.
- **요청제한 429** 가 0이 아니면 `TRUST_PROXY` 를 빠뜨린 것입니다. 그 결과는 버리세요.
- **화면 하나 합계** 는 한 화면을 끝까지 보는 동안 서버가 쓴 시간의 합입니다
  (사람이 화면 보는 시간 제외). 사용자가 체감하는 값에 제일 가깝습니다.

원본은 `loadtest/results/*.json` 에 남습니다.

### 혼자일 때와 견줍니다

`smoke.js` 의 값이 기준선입니다. 200명일 때 p95 가 그 열 배면 몰려서 밀린 것이고,
혼자일 때부터 느렸으면 쿼리나 페이로드 문제입니다. 둘은 고치는 곳이 다릅니다.
