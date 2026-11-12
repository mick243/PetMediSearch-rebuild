# PetMediSearch 개발 지침서

반려동물 병원·약국을 찾고, 후기와 글을 남기고, 아이의 접종·검진 일정을 챙기는 앱입니다.

| 구성 | 스택 | 포트 |
|---|---|---|
| `client/` | React 18 + TypeScript + Vite, styled-components, Redux Toolkit, React Router v6 | 5000 |
| `server/` | Express + TypeScript(ESM) + mysql2(콜백 방식) | 8081 |
| DB | MySQL 8 — Docker 컨테이너 `petmedisearch-mysql` | 3306 |

```bash
cd client && npm run start
```

**규모 가정은 가입자 1만 명, DAU 2000명입니다.** 성능에 관한 모든 판단은 이 숫자를
기준으로 합니다. "지금은 데이터가 적어서 괜찮다"는 근거가 되지 않습니다.

> **지금 상태의 정본은 루트 `SSOT.md`** 입니다. 브랜치 · 수치 · 미해결 · 다음 작업은 거기서 봅니다. 데이터 건수는 문서 대신 개발 DB 를 직접 조회합니다.
>
> 상시 규칙은 `.claude/rules/` 에 있습니다 — `daily-ssot-update.md`(매일 18:40 에 진행 상태를 다시 재서 `SSOT.md` 를 갱신).
>
> **진행 중인 큰 작업 — 백엔드 재설계(Prisma · TypeScript).** 계획은 `docs/Backend-Rebuild-Plan-2026-09-28.md`, 이어받을 때는 `docs/Backend-Rebuild-Handoff-2026-09-28.md` 를 먼저 읽습니다. 어느 모델·세션이 이어받든 그 문서가 출발점입니다.

---

## 1. 일하는 방식

### 1.1 추측하지 말고 잰다

느릴 것 같다고 고치지 않고, 재서 느린 것만 고칩니다. 대신 잴 때는 **실제 규모로**
잽니다. 시드 데이터가 100건이면 어떤 쿼리도 빠릅니다.

`server/scripts/seedScale.ts` 가 **복사본 DB** 에 사용자 1만·글 2만·댓글 6만·후기
1.5만 건을 넣습니다. 운영 중인 DB 에는 넣지 않습니다.

이 방식으로 찾은 것들입니다. 전부 눈으로 보면 멀쩡했습니다.

| 대상 | 전 | 후 | 원인 |
|---|---|---|---|
| `GET /category?category=1` | 30.7 MB | 4.6 KB | 전체를 내려주고 화면에서 3건만 씀 |
| 시설 후기 목록 | 14.4 MB | 725 B | 페이지네이션 없음 + 사진이 목록에 실림 |
| 전국 시설 검색 | 933 KB | 47.8 KB | `LIMIT 2000` |
| 댓글 300건짜리 글 | 68,081 B | 1,363 B | 스레드 전체를 한 번에 |

### 1.2 고쳤다고 말하기 전에 화면에서 본다

`tsc` 통과와 ESLint 통과는 **컴파일이 됐다는 뜻일 뿐**입니다. 사용자가 할 일을
그대로 해 보기 전에는 됐다고 하지 않습니다.

- 실제 로그인 → 실제 클릭 → 화면 확인
- 네트워크 탭에서 요청이 실제로 나갔고 응답이 200인지
- 새로고침 후에도 남아 있는지 (저장이 됐는지)

예: 일정 완료 체크를 넣고 나서 체크 → `PATCH` 200 → 배지 변화 → 정렬 이동 →
카운트 감소 → 새로고침 후 유지까지 확인한 뒤에 보고했습니다.

### 1.3 남의 데이터로 시험했으면 되돌린다

확인하려고 켠 체크는 끄고, 넣은 시드는 지웁니다. 무엇을 건드렸고 무엇을
되돌렸는지 보고에 씁니다.

### 1.4 진단이 틀렸으면 정정한다

없는 버그를 "고치면" 멀쩡한 코드가 망가집니다. 재현되지 않으면 고치지 않고,
왜 재현이 안 되는지 말합니다. 이미 "버그가 있다"고 말한 뒤라도 마찬가지입니다.

측정값을 잘못 말한 것도 정정합니다 — `limit=200` 을 요청했지만 서버가 30으로
자른 값을 "개선 전"이라고 보고한 적이 있습니다.

### 1.5 요청한 것만 한다

"리스트가 비면 숨겨 주세요"와 "비회원일 때만 보여 주세요"는 다른 요청입니다.
읽은 대로 만들되, 두 가지로 읽힐 때는 만들기 전에 묻습니다.


### 1.6 보안 작업은 막는 쪽으로만 쓴다

취약점을 고칠 때 공격을 재현하는 스크립트나 우회 입력(헤더 위조 · 주입 문자열 따위)을 만들지 않습니다.
원인은 코드와 설정을 읽어 설명하고, 고친 것은 입구 검사의 단위 테스트와 정상 요청으로 확인합니다.
보고와 PR 도 "무엇을 어떻게 막았나" 로 씁니다 — 공격 절차를 적은 글은 저장소를 받는 누구에게나 그대로 넘어갑니다.
---

## 2. 서버 규약

### 2.1 오류 응답은 `{ message }` 하나

```js
return res.status(404).json({ message: '글을 찾을 수 없습니다.' });
```

- `error` 키는 쓰지 않습니다. 한때 `message` 49곳 / `error` 38곳으로 섞여 있어서,
  한쪽만 보는 화면에서는 서버가 보낸 문구가 묻히고 기본 문구만 떴습니다.
- **예외 객체를 응답에 싣지 않습니다.** 표 이름과 쿼리가 그대로 드러납니다.
  원인은 `console.error` 로 서버 로그에만 남깁니다.
- 마지막 그물은 `server/app.ts` 맨 아래의 404 핸들러와 오류 핸들러입니다.
  이게 없으면 Express 기본 처리로 넘어가 HTML 이 돌아오고, JSON 을 기대하던
  화면이 엉뚱한 곳에서 터집니다.

### 2.2 권한은 토큰이 아니라 DB 에서 본다

`server/controller/authUser.ts`:

```js
const IS_ADMIN = "(SELECT role FROM users WHERE user_id = ?) = 'admin'";
const OWNER_OR_ADMIN = `(user_id = ? OR ${IS_ADMIN})`;
```

토큰에도 `role` 이 실려 있지만 하루짜리입니다. 권한을 거둬들여도 남은 토큰으로
계속 지울 수 있으면 안 됩니다. 삭제는 자주 일어나지 않아 조회 한 번이 붙어도
부담이 없습니다. (권한을 뺏고 남은 토큰으로 재시도해 404 가 나오는 것까지 확인함)

### 2.3 목록은 전부 페이지로 끊는다

요청은 `?page=&limit=`, 응답은 `{ <목록이름>, total }` 모양입니다.

| 컨트롤러 | 기본 | 상한 | 응답 |
|---|---|---|---|
| `category.ts` | 10 | 50 | `{ posts, total }` |
| `comment.ts` | 5 | 30 | `{ comments, total, count }` — `total` 은 스레드 수, `count` 는 전체 댓글 수 |
| `review.ts` | 5 | 20 | `{ reviews, total }` |

- `limit` 은 **반드시 서버에서 상한을 건다**. 클라이언트가 `limit=100000` 을 보내면
  페이지네이션이 없는 것과 같습니다.
- `total` 이 없으면 화면이 "다음 쪽이 있는지" 알 수 없습니다. 같이 보냅니다.

### 2.4 `ORDER BY` 에 반드시 동점 처리를 붙인다

```sql
ORDER BY created_at DESC, review_id DESC
```

`created_at` 은 초 단위라 같은 값이 흔합니다. 동점 처리가 없으면 MySQL 이 순서를
보장하지 않아, **쪽을 넘길 때 같은 글이 두 번 나오거나 어떤 글은 아예 안 나옵니다.**
댓글 페이지네이션을 시험하다 실제로 겪었고, 댓글·글·후기 세 곳을 모두 고쳤습니다.

### 2.5 큰 컬럼은 목록에서 뺀다

후기 사진은 한 장에 100KB 가 넘습니다. 목록에 실으면 펼치지도 않은 후기의
사진까지 전부 내려옵니다.

```sql
SELECT review_id, ..., COALESCE(JSON_LENGTH(images), 0) AS image_count
FROM reviews WHERE facility_id = ? ORDER BY created_at DESC, review_id DESC LIMIT ? OFFSET ?
```

장수만 보내고, 실제 사진은 펼칠 때 `GET /reviews/:id/images` 로 그 글 것만
받아갑니다. 429KB → 725B.

### 2.6 사용자가 보낸 것은 서버에서 다시 본다

화면이 이미 줄여서 보내도 요청은 화면을 거치지 않고 올 수 있습니다.

```js
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
```

- `svg+xml` 을 막습니다 (스크립트가 들어갑니다)
- 외부 주소를 막습니다. 저장해 두면 후기를 보는 **다른 사람의 브라우저**가 그
  주소를 대신 불러 주게 됩니다.
- 길이 상한도 겁니다 (`MAX_IMAGE_LENGTH = 2MB`, 본문 상한 3mb 에 맞춤)

### 2.7 "값 없음"을 구분한다

수정 API 에서 `images === undefined` (그대로 두기)와 `images === []` (전부 지우기)는
다른 뜻입니다. 하나로 뭉치면 사진을 뺄 방법이 없어집니다.

### 2.8 중복은 미리 조회하지 말고 제약이 낸 오류를 받는다

```js
if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
```

먼저 `SELECT` 로 확인하면 그 사이에 끼어드는 가입을 못 막습니다.

### 2.9 로그인 실패 문구는 한 가지로

이메일이 없는 것과 비밀번호가 틀린 것을 같은 문구로 답합니다. 나누면 그 이메일로
가입했는지가 새어 나갑니다.

### 2.10 받은 값은 DB 에 닿기 전에 검사한다

`server/controller/validate.ts` 를 씁니다. 그대로 INSERT 하면 빈 제목도 70KB
댓글도 통과한 뒤 DB 제약에서 500 으로 죽고, 로그에는 쿼리 전문이 남습니다.

에디터 본문은 `trim` 으로 부족합니다. ReactQuill 이 빈 글을 `<p><br></p>` 로
보내서 `!content` 에 걸리지 않습니다 — `richTextHasContent` 로 봅니다.

다른 표를 가리키는 번호(`post_id` · `facility_id` · `category_id`)는 `idField` 로 봅니다.
JSON 본문과 쿼리스트링의 값은 배열이나 객체일 수 있고, `Number()` 는 `[5]` 와 `true` 까지
숫자로 바꿔 줍니다. 사진 data URL 은 `isImageDataUrl` 하나로 봅니다(후기·반려동물 공용).

### 2.11 오류는 `logError` 로 남긴다

```js
logError('addPostById', err);   // console.error(err) 금지
```

mysql2 오류는 `err.sql` 에 쿼리 전문을 들고 있습니다. 사진이 붙은 글 하나가
실패하면 100KB base64 가 로그에 남고, 값으로 들어간 개인정보도 같이 남습니다.
axios 오류를 통째로 찍으면 요청 config 에 실린 `client_secret` 까지 남습니다.

같은 이유로 **쿼리·요청 본문·외부 API 응답을 `console.log` 하지 않습니다.**

### 2.12 인증 경로에는 요청 제한을 건다

`server/middleware/rateLimit.ts` — 로그인 15분에 실패 10번, 가입 1시간에 5개,
그 밖은 1분에 300번. 개발에서도 켜 둡니다.

프록시 뒤에 두면 `TRUST_PROXY` 를 설정해야 합니다. 없으면 모든 사용자가
프록시 주소 하나로 묶여, 한 사람 때문에 전부 막힙니다.

반대로 **프록시를 거치지 않고 API 포트에 바로 닿는 길이 있으면 켜지 않습니다** — 한도가
제 역할을 못 합니다. 그래서 `docker-compose.yml` 은 API 를 `127.0.0.1` 에만 열고, 이 값을
박아 두지 않고 `server/.env` 에 둡니다. 값을 읽는 규칙은 `server/trustProxy.ts` 입니다
(`true` 는 서버가 뜨지 않습니다).

---

## 3. 데이터베이스

### 3.1 스키마 변경은 마이그레이션으로 남긴다

`server/prisma/migrations/<시각>_<이름>/migration.sql` 에 한 단계씩. `schema.prisma` 를 고치고
`npx prisma migrate dev --create-only --name <이름>` 으로 파일을 만든 뒤, Prisma 가 쓰지 못하는 것
(CHECK · 생성 컬럼 · 컬럼 COMMENT · `ON UPDATE CURRENT_TIMESTAMP`)은 손으로 보탭니다. 파일 맨 위에
**왜 필요한지**를 주석으로 답니다.

CI 가 `npm run migrate:diff` 로 **마이그레이션 ↔ `schema.prisma` 의 차이가 0 인지** 봅니다.
한쪽만 고치면 거기서 멈춥니다. 예전에는 `createTables.sql`(신규) 과 `alter*.sql`(기존) 두 갈래를
손으로 맞췄고, 어긋나도 알 길이 없었습니다.

- 새 DB: `npx prisma migrate deploy`. 앱이 돌기 위한 기준 데이터(분류 9개, `ALL_CATEGORY_ID = 1`)는
  `0_init` 안에 있고, 예시 계정은 `prisma/seed.ts`(`npx prisma db seed`)로 따로 넣습니다.
- 2026-09-28 이전 스키마로 이미 돌고 있는 DB: 적용하지 않고 `npx prisma migrate resolve --applied 0_init`
  로 표시만 합니다. 운영은 사람이 스키마가 같은지 확인한 뒤 합니다.
- CLI 는 root 로 붙습니다 — `prisma.config.ts` 가 `DB_ROOT_PASSWORD` 로 URL 을 만듭니다. 앱 계정으로는
  CREATE TABLE 이 안 됩니다. 그림자 DB `<DB_NAME>_shadow` 는 Prisma 가 만들어 주지 않으니 한 번 만들어 둡니다.
- `scripts/alter*.sql` · `createTables.sql` 은 기록으로 남아 있고, compose 초기화는 아직 그것을 씁니다
  (재설계 4단계에서 `migrate deploy` 로 바꿈). **새 변경은 거기에 넣지 않습니다.**

적용 전에 대상 표를 백업하고, 되돌리는 SQL 을 같이 적어 둡니다.

### 3.2 인덱스는 `WHERE` + `ORDER BY` 를 한 덩어리로

```sql
ADD KEY `idx_posts_category_recent` (`category_id`, `deleted_at`, `created_at`)
```

목록 쿼리는 전부 "조건 + `created_at` 내림차순 + `LIMIT`" 모양입니다. 정렬 순서를
인덱스에 담지 않으면 표를 통째로 읽고 정렬합니다 — 글 2만 건에서 매 요청
18,000행이었습니다. `EXPLAIN` 에 `type=ALL` 이나 `Using filesort` 가 보이면 덜 된
것입니다.

### 3.3 삭제는 `deleted_at`

`deleted_at timestamp(3)` 을 세우고 조회에 `AND deleted_at IS NULL` 을 붙입니다.
관리자가 답글까지 지울 때는 재귀 CTE(`WITH RECURSIVE`)로 자손을 모아 한 번에
`UPDATE` 합니다.

### 3.4 지금 남아 있는 부채

**사진이 DB 안에 있습니다** (`pets.photo`, `reviews.images`). 파일 서버가 없어서
줄인 JPEG 를 data URL 로 넣고 있습니다. 페이로드 문제 여러 건의 뿌리가 여기입니다.
`posts.excerpt` / `posts.thumbnail` 컬럼 추가도 이 결정 뒤에 하는 게 맞습니다.

---

## 4. 클라이언트 규약

### 4.1 색·간격은 theme 토큰으로

```tsx
color: ${({ theme }) => theme.color.textMuted};
padding: ${({ theme }) => theme.space.lg};
```

한때 색이 30개 파일 163곳에 하드코딩돼 있었습니다. `client/src/style/theme.ts`
에서만 바꾸면 되도록 둡니다. 새 색이 필요하면 토큰을 늘립니다.

styled-components 에만 쓰는 props 는 `$` 를 붙입니다 (`$done`, `$tone`) — 안 붙이면
DOM 속성으로 새어 나가 콘솔 경고가 뜹니다.

### 4.2 오류 문구는 `apiErrorMessage` 로

```tsx
alert(apiErrorMessage(error, '일정을 바꾸지 못했습니다.'));
```

`client/src/utils/apiError.ts`. 화면마다 `data.message` 를 손으로 뒤지지 않습니다.
응답이 아예 없으면(네트워크 끊김) 서버 오류와 갈라서 다른 문구를 냅니다 —
안 갈라주면 왜 안 되는지 알 길이 없어 같은 버튼을 계속 누르게 됩니다.

### 4.3 즉시 반응하는 조작은 낙관적 업데이트 + 롤백

체크박스, 좋아요, 즐겨찾기처럼 결과가 뻔한 조작은 **화면부터 바꾸고** 서버에
보냅니다. 실패하면 되돌리고 문구를 띄웁니다.

```tsx
setSaving(v.vaccination_id);
apply(next);
try { await setVaccinationDone(v.vaccination_id, next); }
catch (error) { apply(!next); alert(apiErrorMessage(error, '...')); }
finally { setSaving(null); }
```

성공 후 목록 전체를 다시 받는 것도 피합니다 — 반려동물 사진 27KB 가 딸려옵니다.

### 4.4 되돌리기가 확인창보다 낫다

여러 개를 정리할 때 확인창은 성가십니다. 바로 실행하고 6초짜리 되돌리기 줄을
띄웁니다 (`client/src/pages/Favorites.tsx` 의 `UNDO_MS`). 되돌리기 줄은 뷰포트가
아니라 `max-width: 415px` 열에 맞춥니다 — Layout 이 그 폭으로 가운데 정렬입니다.

### 4.5 버튼 안에 버튼을 넣지 않는다

한 줄에 여는 동작과 별도 버튼(별·체크박스)이 같이 필요하면, `<div>` 를 grid 로
깔고 나란히 둡니다. `Favorites.tsx`, `Vaccinations.tsx` 가 같은 모양입니다.

```tsx
const Row = styled.div<{ $done: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
`;
```

### 4.6 상태 표시는 두 가지 신호로

완료한 줄은 흐리게(`opacity: 0.55`) **그리고** 취소선을 같이 겁니다. 흐림만으로는
밝은 화면에서 구분이 안 됩니다.

### 4.7 다시 열어도 남아야 하는 값은 쿼리스트링에

```tsx
navigate(`/search?lat=${f.lat}&lng=${f.lng}`);
```

라우터 `state` 로 넘기면 새로고침하거나 링크를 다시 열 때 사라집니다.

### 4.8 사진은 보내기 전에 줄인다

`client/src/utils/image.ts` — 품질 0.82 JPEG.

| 함수 | 쓰는 곳 | 크기 |
|---|---|---|
| `shrinkToSquareDataUrl` | 반려동물 얼굴 (원형) | 320px 정방형 |
| `shrinkToDataUrl` | 후기 사진 | 긴 변 720px |
| `shrinkToDataUrl` | 글 본문 (ReactQuill) | 긴 변 900px |

ReactQuill 은 기본 이미지 핸들러가 원본을 그대로 base64 로 박습니다.
`useQuillModules(quillRef)` 에서 핸들러를 갈아끼워 줄인 뒤 넣습니다.
**핸들러가 실제로 등록됐는지 `quill.getModule('toolbar').handlers.image` 로
확인하고 넘어갑니다** — 조용히 기본 핸들러로 돌아가 있어도 화면상으론 똑같습니다.

### 4.9 언마운트 뒤 setState 를 막는다

```tsx
useEffect(() => {
  let alive = true;
  fetchMyPets().then((rows) => alive && setPets(rows ?? []));
  return () => { alive = false; };
}, []);
```

### 4.10 `noUnusedLocals: true`

리팩터 뒤 안 쓰는 import·변수가 남으면 **빌드가 실패합니다**. 고치고 나면
바로 `npm run build` 로 확인합니다.

---

## 4.11 법적 고지는 코드와 함께 고친다

`client/src/pages/Privacy.tsx` · `Terms.tsx` 는 **이 앱이 실제로 하는 일**을 적은
문서입니다. 아래를 고치면 문서도 같이 고쳐야 합니다.

| 코드 | 문서 |
|---|---|
| `validateSignup` 의 수집 항목 | 방침 1장 "수집하는 개인정보" |
| `withdraw` 의 파기 범위 | 방침 2장 "보유 기간과 파기" |
| 외부 서비스 추가 (분석 도구 등) | 방침 3장 "제3자 제공과 처리 위탁" |
| `AI_PROVIDER` (후기 요약을 만드는 제공자, `server/ai/`) | 방침 3장 사업자 표의 "시설 후기 요약" 행 |
| 시설 데이터 출처·주기 | 약관 제9조, 푸터 출처 표기 |

`<Todo>` 로 감싼 칸은 노란 배경으로 눈에 띄게 두었습니다. 서비스 시작 전에
채워야 하고, 흐린 회색 자리표시자로 바꾸지 마세요 — 그대로 배포됩니다.

---

## 5. 주석

주석은 **무엇을 하는지가 아니라 왜 그렇게 했는지**를 씁니다. 코드를 읽으면 아는
것은 쓰지 않습니다.

```js
/*
 * 사진 자체는 빼고 장수만 보냅니다.
 *
 * 화면은 후기를 펼쳐야 사진을 보여 주는데, 목록에 실어 보내면 펼치지 않은
 * 것까지 전부 내려옵니다. 한 장이 100KB 가 넘어 5건짜리 한 쪽이 429KB 였습니다.
 */
```

- 한국어로, 단정적으로 씁니다
- 숫자로 이유를 댈 수 있으면 숫자를 씁니다
- 두 곳이 같은 값을 써야 하면 서로를 가리킵니다
  (`/** 서버(server/controller/review.ts 의 MAX_IMAGES)와 같은 값이어야 합니다. */`)
- 예전에 뭐가 문제였는지가 다음 사람에게 제일 쓸모 있습니다

---

## 6. 이 환경에서 자주 깨지는 것

Windows + Git Bash 조합에서 실제로 여러 번 당한 것들입니다.

### 6.1 bash 히어독이 백슬래시를 먹는다

`\\` 가 `\` 로 줄어들어 정규식이 조용히 망가집니다. (`escapeLike` 와 Python 정규식,
`confirm('...\n...')` 에서 네 번 겪음)

→ 한국어나 백슬래시가 든 긴 파일은 **Write/Edit 도구로 씁니다.** 꼭 셸로 해야 하면
`chr(92)` 를 쓰거나 줄 단위로 바꿉니다.

### 6.2 Git Bash 에서 한글이 CP949 로 깨진다

`curl -d '{"username":"테스트"}'` 가 서버에 깨져서 도착합니다.

→ UTF-8 JSON 파일로 쓰고 `curl --data-binary @file.json` 으로 보냅니다.

### 6.2.1 SQL 파일의 한글이 깨진다

`.sql` 을 파이프로 넣을 때 클라이언트가 파일을 latin1 로 읽으면 문법 오류가 아니라
**조용히 깨진 값이 들어갑니다.**

```
enum('약국','병원')  →  enum('ì•½êµ­','ë³‘ì›')
분류 이름 '강아지'    →  'ê°•ì•„ì§€'
```

**새 `.sql` 파일에는 반드시 맨 위에 `SET NAMES utf8mb4;` 를 넣습니다.** 그러면
어떻게 실행하든 안전합니다 — `docker-entrypoint-initdb.d` 로 도는 초기화에는
플래그를 붙일 자리가 아예 없습니다(실제로 배포 검증에서 여기 걸렸습니다).

손으로 넣을 때는 플래그도 함께 주는 편이 좋습니다.

```bash
docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < scripts/<파일>.sql
```

MySQL 설정 파일(`my.cnf`)로 푸는 방법은 **Windows 에서 통하지 않습니다.**
바인드 마운트든 compose `configs` 든 파일이 0777 이 되고, MySQL 은
`World-writable config file ... is ignored` 경고만 남기고 무시합니다.

### 6.3 일괄 치환이 한국어 조사를 깬다

`단골` → `즐겨찾기` 를 통째로 바꿨더니 `즐겨찾기이`, `즐겨찾기은`, `즐겨찾기을` 이
됐습니다. 받침이 바뀌면 조사도 바뀝니다. 치환 뒤 조사를 따로 훑습니다.

### 6.4 import 를 "마지막 import 줄" 뒤에 넣으면 안 된다

여러 줄짜리 import 블록 **안쪽**에 꽂혀 모듈이 깨집니다. 정확한 문자열 치환으로
넣고, Vite 가 그 모듈을 200 으로 주는지 확인합니다.

### 6.5 워크트리를 벗어나지 않는다

작업은 받은 워크트리(`.claude/worktrees/...` · `.Codex/worktrees/...` 등) 안에서만 합니다. 베이스 체크아웃을 고치면 훅이
막습니다. 워크트리에는 `.env` 를 복사하고 `node_modules` 를 연결해 둡니다
(단, Turbopack 처럼 정션을 거부하는 도구는 실제 `npm ci` 가 필요합니다).

**연결한 `node_modules` 에서 `npm install` 을 하면** npm 이 링크를 걷어 내고 그 워크트리에 새로 깝니다.
이 기계의 npm 11 은 승인하지 않은 설치 스크립트를 돌리지 않아, 그렇게 새로 깐 곳에는 bcrypt 네이티브 모듈이
빠집니다(런타임에 깨짐). 의존성을 바꾸는 워크트리는 빌드된 `node_modules` 를 **복사**해 독립시킨 뒤 설치합니다.

---

## 6.6 배포 관련 규약

- **DB 는 풀로 씁니다** (`server/mysql.ts`). 커넥션 하나로 쓰면 쿼리가 한 줄로 서고,
  MySQL 의 `wait_timeout`(8시간)에 끊긴 뒤 되살아나지 않습니다.
- **`/health` 는 실제로 쿼리를 던져 봅니다.** 프로세스만 떠 있고 DB 에 못 닿는
  상태가 가장 흔한데, 그때 200 을 주면 감시 도구가 멀쩡하다고 봅니다.
- **`SIGTERM` 을 처리합니다** (`app.ts` 아래쪽). `docker stop` 은 10초 뒤 강제로
  죽이므로, 처리 없이는 배포할 때마다 진행 중이던 요청이 끊깁니다.
- **Dockerfile 의 `CMD` 는 `npm start` 가 아니라 `node dist/app.js`** 입니다.
  npm 을 거치면 SIGTERM 이 node 까지 가지 않아 위 처리가 동작하지 않습니다.
- **환경변수를 늘리면 `server/.env.example` 에도 적습니다.** 실제 `.env` 는
  git 에 없어서, 그 파일이 유일한 목록입니다.
- **앱은 root 로 DB 에 붙지 않습니다.** 전용 계정(`scripts/createDbUser.ts`)은 자기 DB 의
  행 읽기·쓰기와 `emoticons` 의 ALTER 만 갖습니다. 스키마 변경·백업·규모 시드는 root 로
  하고, root 암호(`DB_ROOT_PASSWORD`)는 앱 컨테이너에 넘기지 않습니다. 비밀번호는 코드에
  적지 않습니다 — `importData.ts` 에 root 암호가 박혀 공개돼 있었습니다.

---

## 6.7 테스트

테스트는 **한 번에 다 붙이지 않고, 고치는 것마다 하나씩** 붙입니다.
지금 있는 것도 전부 이번에 실제로 문제가 났던 자리입니다.

| 대상 | 도구 | 왜 |
|---|---|---|
| `server/search.ts` | `node --test` | 검색 규칙이 눈으로 읽어서는 맞는지 모릅니다 |
| `server/controller/validate.ts` | `node --test` | 여기가 뚫리면 DB 제약에서 500 이 납니다 |
| `client/src/utils/*.ts` | Vitest | 순수 함수라 값싸게 고정할 수 있습니다 |

```bash
cd server && npm test     # node --test (tsx 로 .ts 를 바로 돌림), DB 없음
cd client && npm test     # vitest run
```

**`app.ts` 에 순수 함수를 두지 않습니다.** import 하는 순간 서버가 떠서
테스트에서 부를 수 없습니다. 검색 로직을 `server/search.ts` 로 뺀 이유입니다.

서버는 TypeScript(strict)입니다. `npm run typecheck` 가 "부르는데 가져오지 않은 식별자" 를
잡습니다 — 실제로 그 버그가 두 파일에 있었습니다(예전에는 ESLint 의 `no-undef` 가 하던 일).
ESLint(`server/.eslintrc.cjs`, typescript-eslint)도 그대로 돕니다. 서버 코드에서 `any` 는 오류입니다.

CI 는 `.github/workflows/ci.yml` 에서 밀어 넣을 때마다 위를 전부 돕니다.

### 응답 기준선 (`server/contract/`)

고정 데이터를 깐 전용 DB 에 앱을 띄우고, 라우터를 전부 지나가는 81개 요청의 응답을
`golden.json` 과 한 글자씩 비교합니다. 서버 내부를 바꾸는 작업(TypeScript·Prisma 이행)은
**이게 통과해야 끝난 것**입니다. 날짜가 문자열에서 Date 로, DECIMAL 이 `'3.20'` 에서 `3.2` 로
바뀌는 것처럼 눈으로는 놓치는 변화를 잡습니다(`dateStrings` 하나를 끄면 12단계가 깨짐).

```bash
docker run -d --name pms-contract-mysql -p 127.0.0.1:3307:3306 -e MYSQL_ROOT_PASSWORD=<암호> mysql:8.4.11 --default-time-zone=+09:00
cd server && CONTRACT_DB_HOST=127.0.0.1 CONTRACT_DB_PORT=3307 CONTRACT_DB_PASSWORD=<암호> npm run test:contract
```

- 공유 개발 DB(3306)에 대고 돌리지 않습니다. `petmedisearch_contract` 를 지우고 새로 깝니다.
- 응답이 **일부러** 바뀌었으면 `UPDATE_GOLDEN=1` 로 다시 뜨고, 무엇이 왜 바뀌었는지 커밋에 적습니다.
- 앱은 root 가 아니라 앱 계정(`scripts/createDbUser.ts`) 권한으로 붙습니다. 권한이 모자란 자리도 여기서 드러납니다.

---

## 7. 끝났다고 말하기 전 점검표

1. `cd client && npm run build` — `tsc -b` 통과 · `cd server && npm run typecheck && npm run build`
2. `cd client && npm run lint` · `cd server && npm run lint` — 경고 0
3. `cd client && npm test` · `cd server && npm test` — 전부 통과
4. 브라우저에서 **실제로 그 동작**을 해 봄 (로그인 → 클릭 → 화면 → 새로고침)
5. 네트워크 탭에서 요청/응답 확인
6. 시험하며 바꾼 데이터 원상복구
7. 성능에 관한 변경이면 **전/후 수치**를 같이 보고
8. 보고에는 한 것, 안 한 것, 확인 못 한 것을 나눠서 씀

---

## 8. 참고

| 항목 | 값 |
|---|---|
| JWT 페이로드 | `{ id, role }`, 유효기간 1일 |
| 비밀번호 해시 | bcrypt cost 12 |
| 요청 본문 상한 | 3mb (`server/app.ts`) |
| 관리자 계정 만들기 | `cd server && ADMIN_PASSWORD='...' npm run create-admin` (비밀번호 필수) |
| 보안 헤더 | helmet (CSP 는 끔 — API 서버이고 Swagger UI 가 깨짐) |
| Swagger | 개발에서만. `NODE_ENV=production` 이면 `/api` 미등록 |
| 소셜 로그인 state | `client/src/utils/oauthState.ts` — 나갈 때 발급, 돌아올 때 검증 |
| 회원가입 수집 항목 | 이름·전화번호·이메일·주소 |
| 지도 | Kakao Maps SDK, 클러스터링은 서버에서 격자로 |
