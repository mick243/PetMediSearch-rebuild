# PetMediSearch — 프로젝트 SSOT

> **기준 시각: 2026-09-22**
> 근거: git 브랜치 7개 · 워크트리 6개 전수 · `server/` 테스트 실행 · 트리 mtime · 코드베이스. DB 는 **오늘 재지 못했습니다**(§4).
>
> **2026-09-22 신설** — 이 문서를 처음 세웠습니다. 개인 프로젝트(오락실 파인더)의 SSOT 체계를 그대로 들여왔고, 갱신 규칙은 `.claude/rules/daily-ssot-update.md`(매일 18:40) 입니다. 전 절을 오늘 직접 재서 채웠습니다.
>
> 이 문서는 **지금 상태**의 단일 출처입니다. "어떻게 만들었나"는 각 영역 문서가 정본이고, 아래 §1 에 그 지도를 둡니다.

---

## 0. 30초 요약

- **무엇** — 전국 동물병원·동물약국을 지도에서 찾고, 후기·게시판·이모티콘 댓글을 쓰고, 반려동물의 접종·검진 일정을 챙기는 앱. 화면은 React 18 + TypeScript + Vite(5000), API 는 Express + mysql2(8081), DB 는 MySQL 8(3306).
- **어디까지** — 시설 검색·후기·게시판·즐겨찾기·마이페이지·접종 일정·푸시까지 **동작하는 상태**고, 그 위에 09-13 출시 전 점검과 09-15 부하 시험이 한 번씩 돌았습니다. 최근 작업은 그 점검에서 나온 QA 수정입니다.
- **가장 중요한 현재 사실 3가지**
  1. **로컬 `main` 이 원격보다 뒤처져 있습니다.** 로컬 `main` = `4d2a7ef`(09-17), `origin/main` = `8c2de57` — **0 앞 · 2 뒤**. 로컬에서 09-18 이후 새 커밋은 없습니다. → §2
  2. **병합 대기 5커밋** — `claude/k6-load-test-vu200-57ad6a` 가 main 대비 **5 앞 · 3 뒤**. 09-18 의 QA 수정(실패를 "없음" 으로 말하던 것 · 무한 로딩 · 쓰던 글 유실 · 검증 구멍 셋 · 글 본문 외부 이미지 · 댓글 이중 등록 · 즐겨찾기 거짓 성공 · Layout space-between · 메뉴 노출)이 여기에만 있습니다. → §2 · §9
  3. **방치된 미커밋 50건** — `project-ui-ux-review-eedd45` 워크트리에 수정·신규 **50개 파일**이 커밋되지 않은 채 있고, 마지막 손댄 날이 **2026-09-14~15** 입니다. 후기 속성 추출(`reviewAttributes.js` · `alterReviewAttributes.sql`)과 가입 임시저장(`signupDraft.ts`) 같은 **다른 곳에 없는 작업**이 들어 있습니다. → §2 · §8 R3
- **테스트는 돌지만 둘이 깨져 있습니다** — `server/` 에서 `node --test` 59건 중 **57 통과 · 2 실패**. 둘 다 `web-push` 모듈을 못 찾아서고, 코드 결함이 아니라 `node_modules` 가 `package.json` 과 어긋난 것입니다. → §7 · §8 R1
- **데이터는 오늘 재지 못했습니다** — Docker 데몬이 떠 있지 않고 3306 도 닫혀 있습니다. §4 의 수치는 전부 미재측입니다.
- **다음 한 걸음** — `git pull` 로 로컬 main 을 원격에 맞추고, 그다음 k6 브랜치 5커밋 병합 판정. → §9

---

## 1. 무엇의 정본이 어디에 있는가

| 알고 싶은 것 | 정본 | 위치 | 최신성 |
|---|---|---|---|
| **지금 상태 · 수치 · 미해결** | **이 문서** | `SSOT.md` (main 루트) | 2026-09-22 |
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
| **`main`** | `4d2a7ef` (09-17) | **주 체크아웃** (미커밋 0) | — | **정본.** `origin/main`(`8c2de57`) 보다 **2커밋 뒤** — `git pull` 필요 |
| `claude/k6-load-test-vu200-57ad6a` | `bc8fdc1` (09-18) | 있음 (미커밋 0) | 5 앞 / 3 뒤 | ⏳ **병합 대기 5커밋** — 09-18 QA 수정 |
| `claude/project-ui-ux-review-eedd45` | `0729241` | 있음 (**미커밋 50**) | 0 앞 / 36 뒤 | ⚠ **손대지 말 것.** 브랜치 자체는 병합 완료지만 워크트리에 09-14~15 미커밋 작업이 남아 있습니다 |
| `claude/mobile-board-ui-improvements-f99327` | `4d2a7ef` | 있음 (미커밋 0) | 0 앞 / 25 뒤 | ✅ 병합 완료 — **삭제 후보** |
| `claude/petmedisearch-folder-check-dd8c3b` | `24b9931` | 있음 (`AGENTS.md` 미추적 1) | 0 앞 / 38 뒤 | ✅ 병합 완료 — **삭제 후보** |
| `claude/tablist-slide-pet-flow-5034d0` | `883fd87` | 있음 (`AGENTS.md` 미추적 1) | 0 앞 / 27 뒤 | ✅ 병합 완료 — **삭제 후보** |
| `claude/resume-writing-ac8899` | `4d2a7ef` | 없음 | 0 앞 / 0 뒤 | ✅ main 과 완전히 같음 — **삭제 후보** |

### 2026-09-22 상태

- **로컬에서 나흘간 커밋이 없습니다.** `git log --all` 의 마지막 커밋이 `bc8fdc1`(09-18)이고 09-19 · 09-20 · 09-21 · 09-22 에는 하나도 없습니다.
- **원격이 앞서 있습니다.** `git rev-list --left-right --count main...origin/main` = `0	2`. 09-18 의 `8c2de57`(PR #7 병합)이 로컬 main 에 안 들어와 있습니다.
- **미커밋은 한 곳에 몰려 있습니다.** 워크트리 6개 중 넷은 깨끗하고(`AGENTS.md` 미추적 사본 둘 제외), `project-ui-ux-review-eedd45` 한 곳에만 50건이 있습니다.
- **트리에서 가장 최근 mtime** 은 주 체크아웃 기준 `2026-09-18 15:30` 입니다.

### ⚠ 여기서 나오는 함정

- 워크트리 `k6-load-test-vu200-57ad6a` 의 HEAD(`bc8fdc1`)는 **주 체크아웃의 main 보다 최신**입니다. 주 체크아웃만 보고 "최신 코드" 라고 판단하면 09-18 QA 수정을 통째로 놓칩니다.
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

> **2026-09-22 전부 미재측입니다.** Docker 데몬이 떠 있지 않고(`npipe` 연결 실패) `localhost:3306` 도 닫혀 있어 조회하지 못했습니다. 아래는 다음 갱신 때 채울 칸입니다.

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

### 반쪽인 것

- **푸시** — 코드는 있으나 `web-push` 가 설치돼 있지 않아 지금 트리에서는 테스트가 깨집니다(§7 · R1).
- **09-13 QA 에서 나온 수정** — 고쳐져 있지만 **main 이 아니라 병합 대기 브랜치에** 있습니다(§2 · R5).
- **후기 속성 추출** — `project-ui-ux-review` 워크트리에 미커밋으로만 존재(§2 · R3).

### 없는 것

- 클라이언트 테스트 스크립트(`client/package.json` 에 `test` 없음).

---

## 6. 성능 — 목표와 실측

- **오늘 재지 않았습니다.** 정본은 `docs/LoadTest-2026-09-15.md`(2026-09-15 · 200 VU 기준)이고 실행법은 `loadtest/README.md` 입니다. 수치는 그 문서에서 보고, 이 절에는 **다시 잰 값만** 적습니다.
- 그 시험 이후 09-17 에 후기 AI 요약(외부 LLM 호출)이 들어왔습니다. **외부 호출이 있는 경로는 그 시험에 포함돼 있지 않습니다.** → §8 R4

---

## 7. 품질

### 테스트 (2026-09-22 실측)

| 대상 | 명령 | 결과 |
|---|---|---|
| `server/` | `node --test` | **59건 중 57 통과 · 2 실패** (1.14초) |
| `client/` | — | 테스트 스크립트 없음 |

실패 2건은 둘 다 **환경 문제**입니다.

- `push.test.js` — `Cannot find module 'web-push'`
- `scripts/sendReminders.test.js` — 같은 원인

`server/package.json` 에는 의존성이 적혀 있고 `node_modules` 에 없습니다. `npm install` 로 맞추면 사라질 것으로 보이나, **오늘 설치는 하지 않았습니다**(갱신 작업은 재기만 합니다).

### 점검

- `docs/QA-2026-09-13.md` — 출시 전 전체 점검. 고친 목록이 아니라 **고쳐야 할 목록**입니다. 09-18 의 QA 수정 9건이 그 답인데, 지금 **병합 대기 브랜치에만** 있습니다(§2).

---

## 8. 리스크와 미해결

| # | 내용 | 근거 | 상태 |
|---|---|---|---|
| **R1** | `node_modules` 가 `package.json` 과 어긋나 서버 테스트 2건이 깨집니다 | 2026-09-22 `node --test` 실행 | 미해결 — `npm install` 로 확인 필요 |
| **R2** | 로컬 `main` 이 `origin/main` 보다 2커밋 뒤. 이 상태에서 새 작업을 얹으면 갈라집니다 | `rev-list --count main...origin/main` = 0/2 | 미해결 |
| **R3** | `project-ui-ux-review` 워크트리의 미커밋 50건이 **09-14~15 이후 방치**. 후기 속성 추출·가입 임시저장은 다른 어디에도 없습니다 | 워크트리 `git status --short` | 미해결 — 살릴지 버릴지 판정 필요 |
| **R4** | 부하 시험(09-15) 이후 외부 LLM 호출 경로(후기 AI 요약, 09-17)가 들어왔는데 그 경로는 시험에 없습니다 | 커밋 `0339635` · `docs/LoadTest-2026-09-15.md` | 미해결 |
| **R5** | QA 점검(09-13)에서 나온 수정이 main 에 없습니다 | §2 병합 대기 5커밋 | 미해결 — 병합하면 풀립니다 |

---

## 9. 다음 작업 (권장 순서)

1. **`git pull`** — 로컬 main 을 `origin/main` 에 맞춥니다(2커밋). 이게 먼저입니다. (R2)
2. **k6 브랜치 5커밋 병합 판정** — `claude/k6-load-test-vu200-57ad6a`. 09-18 QA 수정이 전부 여기 있습니다. main 이 3커밋 앞서 있어 rebase 또는 merge 가 필요합니다. (R5)
3. **`npm install` 로 테스트 2건 복구** — `server/` 에서. (R1)
4. **방치된 워크트리 50건 판정** — `project-ui-ux-review-eedd45`. 살린다면 브랜치를 새로 따서 커밋, 버린다면 워크트리를 지웁니다. **판정 전에는 손대지 않습니다.** (R3)
5. **병합 완료 브랜치 4개 정리 제안** — `mobile-board-ui-improvements-f99327` · `petmedisearch-folder-check-dd8c3b` · `tablist-slide-pet-flow-5034d0` · `resume-writing-ac8899`. 전부 자기 커밋 0.
6. 후기 AI 요약 경로 부하 재측정. (R4)

> 1 · 2 · 4 · 5 는 **사용자 결정 사항**입니다. 이 문서의 갱신 규칙은 병합·삭제·pull 을 스스로 하지 않습니다.

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
