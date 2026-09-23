# PetMediSearch — 프로젝트 SSOT

> **기준 시각: 2026-09-23**
> 근거: git 로컬 브랜치 8개 · 워크트리 6개 전수 · reflog · `server/` 테스트 실행 · 트리 mtime. DB 는 **오늘도 재지 못했습니다**(§4 · 컨테이너 정지).
>
> **2026-09-23 갱신** — PR #8 로 09-18 QA 수정 5커밋이 main 에 들어왔고 로컬 main 이 원격과 다시 같아졌다(0/0). 테스트 78건 중 76 통과. §0 · §1 · §2 · §4 · §5 · §7 · §8(R2 · R5 해결, R6 신설) · §9 반영
>
> **2026-09-22 신설** — 이 문서를 처음 세웠습니다. 개인 프로젝트(오락실 파인더)의 SSOT 체계를 그대로 들여왔고, 갱신 규칙은 `.claude/rules/daily-ssot-update.md`(매일 18:40) 입니다. 전 절을 오늘 직접 재서 채웠습니다.
>
> 이 문서는 **지금 상태**의 단일 출처입니다. "어떻게 만들었나"는 각 영역 문서가 정본이고, 아래 §1 에 그 지도를 둡니다.

---

## 0. 30초 요약

- **무엇** — 전국 동물병원·동물약국을 지도에서 찾고, 후기·게시판·이모티콘 댓글을 쓰고, 반려동물의 접종·검진 일정을 챙기는 앱. 화면은 React 18 + TypeScript + Vite(5000), API 는 Express + mysql2(8081), DB 는 MySQL 8(3306).
- **어디까지** — 시설 검색·후기·게시판·즐겨찾기·마이페이지·접종 일정·푸시까지 **동작하는 상태**고, 그 위에 09-13 출시 전 점검과 09-15 부하 시험이 한 번씩 돌았습니다. 09-13 점검에서 나온 QA 수정이 **09-23 에 main 에 들어왔습니다**.
- **가장 중요한 현재 사실 3가지**
  1. **09-18 QA 수정이 main 에 들어왔습니다.** 09-23 18:40 GitHub PR #8(`f85dcec`)로 `claude/k6-load-test-vu200-57ad6a` 의 5커밋이 병합됐고, 18:44 에 로컬 main 을 `pull --rebase` 해 이 문서 커밋 셋이 그 위로 옮겨졌습니다. 로컬 `main` = `origin/main` = `2c2c5b1`, **0 앞 · 0 뒤**. → §2 · R2 · R5 해결
  2. **방치된 미커밋 50건은 그대로입니다** — `project-ui-ux-review-eedd45` 워크트리에 수정·신규 **50개 파일**, 마지막 손댄 날 **2026-09-14~15**, 오늘 mtime 파일 0. 후기 속성 추출(`reviewAttributes.js` · `alterReviewAttributes.sql`)과 가입 임시저장(`signupDraft.ts`)은 **다른 곳에 없는 작업**입니다. 브랜치는 main 보다 46커밋 뒤라 살리려면 충돌 정리가 필요합니다. → §2 · §8 R3
  3. **병합이 끝난 브랜치가 6개로 늘었습니다** — k6 브랜치까지 자기 커밋 0 이 됐고, `petmedisearch-work-log-organize-6d1b92` 의 3커밋은 main 의 SSOT 커밋과 내용이 같은 rebase 전 사본입니다(`git cherry` 전부 `-`). 살아 있는 브랜치는 사실상 `project-ui-ux-review` 하나입니다. → §2 · §9
- **테스트는 늘었고 여전히 둘이 깨져 있습니다** — `server/` 에서 `node --test` **78건 중 76 통과 · 2 실패**(어제 59건 → QA 병합으로 19건 늘어남). 실패 둘은 여전히 `web-push` 모듈 누락, **환경 문제**입니다. → §7 · §8 R1
- **데이터는 오늘도 재지 못했습니다** — Docker 데몬은 떠 있으나 `petmedisearch-mysql` 컨테이너가 5일 전 `Exited (137)` 이고 3306 이 닫혀 있습니다. 규칙상 띄우지 않았습니다. → §4
- **다음 한 걸음** — 방치된 워크트리 50건을 살릴지 버릴지 판정. → §9

---

## 1. 무엇의 정본이 어디에 있는가

| 알고 싶은 것 | 정본 | 위치 | 최신성 |
|---|---|---|---|
| **지금 상태 · 수치 · 미해결** | **이 문서** | `SSOT.md` (main 루트) | 2026-09-23 |
| **이 문서를 갱신하는 규칙** | `.claude/rules/daily-ssot-update.md` | main | 2026-09-22 |
| 데이터 건수 (시설·후기·글 …) | **개발 DB 직접 조회** | `petmedisearch@localhost:3306` | 항상 |
| 개발 규약 · 작업 지침 | `CLAUDE.md` (Codex 사본 `AGENTS.md`) | main | 2026-09-14 |
| 실행법 · 스택 · 포트 | `README.md` | main | 2026-09-14 |
| 출시 전 점검 결과 | `docs/QA-2026-09-13.md` | main | 2026-09-13 |
| 부하 시험 결과 | `docs/LoadTest-2026-09-15.md` · `loadtest/README.md` | main | 2026-09-15 |
| 배포 구성 | `docker-compose.yml` | main | 2026-09-15 |
| 스키마 | `server/scripts/createTables.sql` + `alter*.sql` | main | 2026-09-18 |

---

## 2. 지금 어디에 있나 — 브랜치와 워크트리

| 브랜치 | HEAD | 워크트리 | main 대비(앞/뒤) | 상태 |
|---|---|---|---|---|
| **`main`** | `2c2c5b1` (09-23 rebase) | **주 체크아웃** (미커밋 0) | — | **정본.** 위 셋은 이 문서 커밋, 그 아래 코드 HEAD 는 PR #8 병합 `f85dcec`(09-23 18:40). `origin/main` 대비 **0 앞 · 0 뒤** |
| `claude/k6-load-test-vu200-57ad6a` | `bc8fdc1` (09-18) | 있음 (미커밋 0) | 0 앞 / 8 뒤 | ✅ 병합 완료(PR #8, 09-23) — **삭제 후보**. `origin/` 에도 같은 브랜치가 남아 있음 |
| `claude/project-ui-ux-review-eedd45` | `0729241` (09-14) | 있음 (**미커밋 50**) | 0 앞 / 46 뒤 | ⚠ **손대지 말 것.** 브랜치 자체는 병합 완료지만 워크트리에 09-14~15 미커밋 작업이 남아 있습니다 |
| `claude/petmedisearch-work-log-organize-6d1b92` | `8650e28` (09-22) | 있음 — `mobile-board-ui-improvements-f99327` 폴더 (미커밋 0) | 3 앞 / 8 뒤 | ✅ 사실상 병합 완료 — 앞선 3커밋은 main SSOT 커밋의 rebase 전 사본(`git cherry` 전부 `-`). **삭제 후보** |
| `claude/mobile-board-ui-improvements-f99327` | `7c10c84` (09-15) | 없음 (제 이름 폴더는 위 브랜치가 쓰는 중) | 0 앞 / 35 뒤 | ✅ 병합 완료 — **삭제 후보** |
| `claude/petmedisearch-folder-check-dd8c3b` | `24b9931` (09-13) | 있음 · detached HEAD (`AGENTS.md` 미추적 1) | 0 앞 / 48 뒤 | ✅ 병합 완료 — **삭제 후보** |
| `claude/tablist-slide-pet-flow-5034d0` | `883fd87` (09-14) | 있음 (`AGENTS.md` 미추적 1) | 0 앞 / 37 뒤 | ✅ 병합 완료 — **삭제 후보** |
| `claude/resume-writing-ac8899` | `4d2a7ef` (09-17) | 없음 | 0 앞 / 10 뒤 | ✅ 병합 완료 — **삭제 후보** |

### 2026-09-23 상태

- **코드가 main 에 들어왔습니다.** 09-23 18:40:56 GitHub 에서 PR #8(`f85dcec`)이 병합됐습니다 — `9e0627c` · `99cf661` · `8a21a45` · `bc8fdc1` 과 앞선 `8c2de57`(PR #7) 까지, 47개 파일 +2,204 / −52. 새 스키마 파일 `server/scripts/alterReviewSummaries.sql` 이 같이 들어왔습니다(→ R6).
- **로컬 main 이 원격과 같아졌습니다.** reflog 상 18:44:48 에 `pull --rebase origin main` 이 끝났고, 09-22 의 SSOT 커밋 셋이 `92b76ea` · `495c7ec` · `2c2c5b1` 로 다시 쓰였습니다. `rev-list --left-right --count main...origin/main` = `0 0`.
- **로컬에서 새로 쓴 커밋은 없습니다.** 09-22 이후 `git log --all` 에 보이는 것은 위 병합과 rebase 로 다시 쓰인 SSOT 커밋뿐입니다.
- **미커밋은 여전히 한 곳**(`project-ui-ux-review-eedd45` 50건)이고 오늘 mtime 파일이 없습니다. 주 체크아웃과 `mobile-board-ui-improvements-f99327` 폴더의 오늘 mtime 파일은 pull·checkout 으로 다시 쓰인 것이며 `git status` 는 깨끗합니다.

### 2026-09-22 상태

- **로컬에서 나흘간 커밋이 없습니다.** `git log --all` 의 마지막 커밋이 `bc8fdc1`(09-18)이고 09-19 · 09-20 · 09-21 · 09-22 에는 하나도 없습니다.
- **원격이 앞서 있습니다.** 측정 시점 `git rev-list --left-right --count main...origin/main` = `0 2` — 09-18 의 `8c2de57`(PR #7 병합)이 로컬 main 에 안 들어와 있습니다. 이 문서 커밋 둘 뒤로는 `2 2` 입니다.
- **미커밋은 한 곳에 몰려 있습니다.** 워크트리 6개 중 넷은 깨끗하고(`AGENTS.md` 미추적 사본 둘 제외), `project-ui-ux-review-eedd45` 한 곳에만 50건이 있습니다.
- **트리에서 가장 최근 mtime** 은 주 체크아웃 기준 `2026-09-18 15:30` 입니다.

### ⚠ 여기서 나오는 함정

- ~~워크트리 `k6-load-test-vu200-57ad6a` 의 HEAD(`bc8fdc1`)는 **주 체크아웃의 main 보다 최신**입니다.~~ ✅ 해결 2026-09-23 — PR #8 병합으로 main 이 그 브랜치를 포함합니다(0 앞 / 8 뒤).
- 워크트리 폴더 이름과 체크아웃된 브랜치가 다릅니다. `mobile-board-ui-improvements-f99327` 폴더에는 `claude/petmedisearch-work-log-organize-6d1b92` 가, `petmedisearch-folder-check-dd8c3b` 폴더에는 detached HEAD 가 있습니다. 폴더 이름만 보고 지우면 엉뚱한 브랜치를 건드립니다.
- `AGENTS.md` 는 `CLAUDE.md` 의 Codex 용 사본입니다. 워크트리 둘에서 미추적으로 잡히는 것은 그 브랜치 시점보다 나중에 생겼기 때문입니다. 작업 내용이 아닙니다.

---

## 3. 스택과 실행

| 구성 | 스택 | 포트 | 띄우는 법 |
|---|---|---|---|
| `client/` | React 18 · TypeScript · Vite | 5000 | `npm run dev` (client 안에서) |
| `server/` | Express · mysql2 · JWT · helmet · express-rate-limit | 8081 | `npm run dev` (server 안에서) |
| DB | MySQL 8 | 3306 | `docker compose up -d db` |

- 설정: `server/.env`(`.env.example` 에서 복사) · `client/.env.local` 의 `VITE_KAKAO_MAP_KEY`.
- 시설 데이터 적재: `node scripts/importData.js`, 관리자 생성: `node scripts/createAdmin.js`.
- 스키마는 볼륨이 빈 첫 기동에만 자동 적용됩니다. 쓰던 DB 에는 `server/scripts/alter*.sql` 을 이름 순으로.
- MySQL 시간대는 `--default-time-zone=+09:00` 으로 못박혀 있습니다(이름 있는 시간대는 표 적재가 필요해 쓰지 않습니다).

---

## 4. 데이터 — 개발 DB 실측

> **2026-09-23 전부 미재측입니다 (Docker 정지 · 컨테이너 쪽).** 오늘은 Docker 데몬(29.7.2)이 떠 있지만 `petmedisearch-mysql` 컨테이너가 5일 전 `Exited (137)` 상태이고 `localhost:3306` 이 닫혀 있습니다. 규칙상 DB 를 띄우지 않았습니다. 또 `docker compose ps` 가 `DB_PASSWORD` 보간 오류로 멈춥니다 — `server/.env` 에는 그 키가 있지만 compose 의 `${DB_PASSWORD}` 는 루트 `.env` 나 셸 환경에서만 읽는데 루트 `.env` 가 없습니다. 부록 B 명령도 셸에 `DB_PASSWORD` 를 먼저 넣지 않으면 돌지 않습니다.
>
> 2026-09-22: Docker 데몬이 떠 있지 않고(`npipe` 연결 실패) `localhost:3306` 도 닫혀 있어 조회하지 못했습니다.

| 축 | 값 | 비고 |
|---|---|---|
| 시설(병원·약국) | (미재측) | `README.md` 는 전국 31,493건(병원 20,872 / 약국 10,621)이라고 적고 있으나 **문서 값이며 DB 실측이 아닙니다** |
| 계정 | (미재측) | |
| 게시글 · 댓글 | (미재측) | |
| 후기 | (미재측) | |
| 즐겨찾기 | (미재측) | |
| 반려동물 · 접종 일정 | (미재측) | |
| 이모티콘 | (미재측) | |

재는 법은 부록 B.

---

## 5. 기능 현황

### 되는 것

- **시설 검색·지도** — 공공데이터(지방행정인허가) 기반 병원·약국, WGS84 좌표 변환은 적재 시점에. 카카오 지도.
- **후기** — 작성·목록·별점, 09-17 에 **AI 요약**(후기 5건부터 · Gemini·Claude·OpenAI 중 선택) 추가.
- **게시판** — 글·댓글, 댓글 **이모티콘**(관리자 등록 · 지운 자리는 번호를 당겨 메움), 모바일 전용 UI(당겨서 새로고침 · 헤더 고정).
- **계정** — 가입·로그인(JWT), 비밀번호 변경·탈퇴 시 **남은 토큰 끊기**(`middleware/tokenVersion.js`).
- **마이페이지** — 내 후기·즐겨찾기·반려동물.
- **접종 일정 · 알림** — `node-cron` + web-push, `scripts/sendReminders.js`.
- **운영 장치** — helmet · rate limit · swagger · 로드테스트 스크립트(`loadtest/`).
- **09-13 QA 수정 9건** (09-23 main 병합) — 실패를 "없음" 으로 말하던 것 · 무한 로딩 · 쓰던 글 유실(`useUnsavedGuard`) · 검증 구멍 셋 · 글 본문 외부 이미지 · 댓글 이중 등록 · 즐겨찾기 거짓 성공 · Layout space-between · 후기·즐겨찾기·접종 일정 메뉴 노출.

### 반쪽인 것

- **푸시** — 코드는 있으나 `web-push` 가 설치돼 있지 않아 지금 트리에서는 테스트가 깨집니다(§7 · R1).
- ~~**09-13 QA 에서 나온 수정** — 고쳐져 있지만 **main 이 아니라 병합 대기 브랜치에** 있습니다(§2 · R5).~~ ✅ 해결 2026-09-23 — PR #8 로 main 에 병합. 되는 것으로 옮겨 갔습니다.
- **후기 AI 요약의 스키마** — `alterReviewSummaries.sql` 이 main 에 들어왔지만 쓰던 개발 DB 에 적용됐는지는 DB 가 꺼져 있어 확인하지 못했습니다(R6).
- **후기 속성 추출** — `project-ui-ux-review` 워크트리에 미커밋으로만 존재(§2 · R3).

### 없는 것

- 클라이언트 테스트 스크립트(`client/package.json` 에 `test` 없음).

---

## 6. 성능 — 목표와 실측

- **오늘 재지 않았습니다.** 정본은 `docs/LoadTest-2026-09-15.md`(2026-09-15 · 200 VU 기준)이고 실행법은 `loadtest/README.md` 입니다. 수치는 그 문서에서 보고, 이 절에는 **다시 잰 값만** 적습니다.
- 그 시험 이후 09-17 에 후기 AI 요약(외부 LLM 호출)이 들어왔습니다. **외부 호출이 있는 경로는 그 시험에 포함돼 있지 않습니다.** → §8 R4

---

## 7. 품질

### 테스트 (2026-09-23 실측)

| 대상 | 명령 | 결과 |
|---|---|---|
| `server/` | `node --test` | **78건 중 76 통과 · 2 실패** (0.26초) — 09-22 의 59건에서 QA 병합으로 19건 늘었습니다. 테스트 파일 9개 |
| `client/` | — | 테스트 스크립트 없음 |

실패 2건은 어제와 같은 둘이고 둘 다 **환경 문제**입니다. `server/package.json` 에 `"web-push": "^3.6.7"` 이 있고 `server/node_modules/web-push` 가 없습니다.

- `push.test.js` — `Cannot find module 'web-push'`
- `scripts/sendReminders.test.js` — 같은 원인

`server/package.json` 에는 의존성이 적혀 있고 `node_modules` 에 없습니다. `npm install` 로 맞추면 사라질 것으로 보이나, **오늘 설치는 하지 않았습니다**(갱신 작업은 재기만 합니다).

### 점검

- `docs/QA-2026-09-13.md` — 출시 전 전체 점검. 고친 목록이 아니라 **고쳐야 할 목록**입니다. 09-18 의 QA 수정 9건이 그 답이고, **09-23 에 main 에 들어왔습니다**(PR #8).

---

## 8. 리스크와 미해결

| # | 내용 | 근거 | 상태 |
|---|---|---|---|
| **R1** | `node_modules` 가 `package.json` 과 어긋나 서버 테스트 2건이 깨집니다 | 2026-09-23 `node --test` 78건 중 2 실패 · `node_modules/web-push` 없음 | 미해결 — `npm install` 로 확인 필요 |
| ~~**R2**~~ | ~~로컬 `main` 이 `origin/main` 과 갈라졌습니다~~ | `rev-list --count main...origin/main` = `0 0` | ✅ 해결 2026-09-23 — 18:44 `pull --rebase origin main` (reflog) |
| **R3** | `project-ui-ux-review` 워크트리의 미커밋 50건이 **09-14~15 이후 방치**(9일째). 후기 속성 추출·가입 임시저장은 다른 어디에도 없습니다. 브랜치가 main 보다 46 뒤라 오래 둘수록 살리기 어려워집니다 | 워크트리 `git status --short` 50줄 · 오늘 mtime 0 | 미해결 — 살릴지 버릴지 판정 필요 |
| **R4** | 부하 시험(09-15) 이후 외부 LLM 호출 경로(후기 AI 요약, 09-17)가 들어왔는데 그 경로는 시험에 없습니다 | 커밋 `0339635` · `docs/LoadTest-2026-09-15.md` | 미해결 |
| ~~**R5**~~ | ~~QA 점검(09-13)에서 나온 수정이 main 에 없습니다~~ | PR #8 `f85dcec` · k6 브랜치 0 앞 / 8 뒤 | ✅ 해결 2026-09-23 — GitHub 에서 병합 |
| **R6** | main 에 새로 들어온 `server/scripts/alterReviewSummaries.sql` 이 쓰던 개발 DB 에 적용됐는지 모릅니다. 스키마는 빈 볼륨 첫 기동에만 자동 적용되므로, 안 됐다면 후기 AI 요약이 DB 오류로 떨어집니다 | PR #8 diff · DB 정지로 `SHOW TABLES` 못 함 | 미확인 — DB 를 띄운 날 확인 |

---

## 9. 다음 작업 (권장 순서)

1. ~~**`git pull`** — 로컬 main 을 `origin/main` 에 맞춥니다.~~ ✅ 해결 2026-09-23 (R2)
2. ~~**k6 브랜치 5커밋 병합 판정**~~ ✅ 해결 2026-09-23 — PR #8 (R5)
3. **방치된 워크트리 50건 판정** — `project-ui-ux-review-eedd45`. 이제 이것이 맨 앞입니다. 살린다면 main 에서 브랜치를 새로 따서 옮겨 커밋(46커밋 뒤라 충돌 정리 필요), 버린다면 워크트리를 지웁니다. **판정 전에는 손대지 않습니다.** (R3)
4. **`npm install` 로 테스트 2건 복구** — `server/` 에서. (R1)
5. **DB 를 띄우고 스키마 확인** — 셸에 `DB_PASSWORD` 를 넣거나(`server/.env` 값) `docker compose --env-file server/.env up -d db` 후 `SHOW TABLES` 로 `alterReviewSummaries.sql` 적용 여부 확인, 안 됐으면 적용. 그날부터 §4 가 채워집니다. (R6)
6. **병합 완료 브랜치 6개 정리 제안** — `k6-load-test-vu200-57ad6a`(원격 브랜치 포함) · `petmedisearch-work-log-organize-6d1b92` · `mobile-board-ui-improvements-f99327` · `petmedisearch-folder-check-dd8c3b` · `tablist-slide-pet-flow-5034d0` · `resume-writing-ac8899`. 전부 main 에 없는 내용 0. 워크트리 폴더 이름과 브랜치가 어긋난 곳이 있으니(§2 함정) `git worktree list` 로 짝을 보고 지웁니다.
7. 후기 AI 요약 경로 부하 재측정. (R4)

> 3 · 5 · 6 은 **사용자 결정 사항**입니다. 이 문서의 갱신 규칙은 병합·삭제·pull·DB 기동을 스스로 하지 않습니다.

---

## 10. 고쳐야 할 문서 진술 (드리프트 목록)

| 문서 | 진술 | 실제 |
|---|---|---|
| `README.md` | 시설 전국 31,493건(병원 20,872 / 약국 10,621) | 적재 시점 값입니다. DB 실측으로 확인된 기록이 없습니다 → §4 |
| `docs/LoadTest-2026-09-15.md` | 200 VU 에서 실패 0 · p95 42ms | 그 시점 값입니다. 09-17 의 외부 LLM 호출 경로는 포함되지 않았습니다 → §6 |

---

## 부록 A. 지켜야 할 로컬 운용 규칙

- **다른 워크트리의 미커밋 파일은 읽기만 합니다.** 고치거나 커밋하거나 지우지 않습니다.
- DB 는 **조회만** 합니다. `alter*.sql` 실행 · `importData.js` · `createAdmin.js` 는 갱신 작업에서 돌리지 않습니다.
- 빌드는 하지 않습니다. 테스트만 돌립니다.
- `git pull` · 병합 · 브랜치 삭제는 갱신 작업이 하지 않고 §9 에 제안으로만 적습니다.

---

## 부록 B. 실측 재현 명령

브랜치·워크트리·원격 동기 상태:

```bash
git worktree list && git rev-list --left-right --count main...origin/main
```

테스트 (`server/` 안에서):

```bash
node --test
```

데이터 (DB 가 떠 있을 때 · 값은 `server/.env` 의 `DB_*`):

```bash
docker compose exec db mysql -uroot -p"$DB_PASSWORD" petmedisearch -e "SELECT 'facilities' t, count(*) n FROM facilities UNION ALL SELECT 'users', count(*) FROM users UNION ALL SELECT 'posts', count(*) FROM posts UNION ALL SELECT 'reviews', count(*) FROM reviews"
```

```bash
docker compose exec db mysql -uroot -p"$DB_PASSWORD" petmedisearch -e "SHOW TABLES"
```
