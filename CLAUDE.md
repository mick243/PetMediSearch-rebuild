# PetMediSearch 개발 지침서

반려동물 병원·약국을 찾고, 후기와 글을 남기고, 아이의 접종·검진 일정을 챙기는 앱입니다.

| 구성 | 스택 | 포트 |
|---|---|---|
| `client/` | React 18 + TypeScript + Vite, styled-components, Redux Toolkit, React Router v6 | 5000 |
| `server/` | Express + mysql2(콜백 방식) | 8081 |
| DB | MySQL 8 — Docker 컨테이너 `petmedisearch-mysql` | 3306 |

```bash
cd client && npm run start
```

**규모 가정은 가입자 1만 명, DAU 2000명입니다.** 성능에 관한 모든 판단은 이 숫자를
기준으로 합니다. "지금은 데이터가 적어서 괜찮다"는 근거가 되지 않습니다.

---

## 1. 일하는 방식

### 1.1 추측하지 말고 잰다

느릴 것 같다고 고치지 않고, 재서 느린 것만 고칩니다. 대신 잴 때는 **실제 규모로**
잽니다. 시드 데이터가 100건이면 어떤 쿼리도 빠릅니다.

`server/scripts/seedScale.js` 가 **복사본 DB** 에 사용자 1만·글 2만·댓글 6만·후기
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
- 마지막 그물은 `server/app.js` 맨 아래의 404 핸들러와 오류 핸들러입니다.
  이게 없으면 Express 기본 처리로 넘어가 HTML 이 돌아오고, JSON 을 기대하던
  화면이 엉뚱한 곳에서 터집니다.

### 2.2 권한은 토큰이 아니라 DB 에서 본다

`server/controller/authUser.js`:

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
| `category.js` | 10 | 50 | `{ posts, total }` |
| `comment.js` | 5 | 30 | `{ comments, total, count }` — `total` 은 스레드 수, `count` 는 전체 댓글 수 |
| `review.js` | 5 | 20 | `{ reviews, total }` |

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

---

## 3. 데이터베이스

### 3.1 스키마 변경은 파일로 남긴다

`server/scripts/alter*.sql` 에 한 파일씩. 각 파일 맨 위에 **왜 필요한지와 적용
명령**을 주석으로 답니다.

```
server/scripts/alterUsersAuth.sql     소셜/일반 계정 컬럼
server/scripts/alterSoftDelete.sql    deleted_at
server/scripts/alterReviewImages.sql  images json
server/scripts/alterListIndexes.sql   목록 인덱스
```

신규 설치용 `createTables.sql` 도 같이 고쳐, 새로 까는 사람과 마이그레이션한
사람의 스키마가 같게 둡니다.

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
  (`/** 서버(server/controller/review.js 의 MAX_IMAGES)와 같은 값이어야 합니다. */`)
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

### 6.2.1 mysql 클라이언트에 charset 을 안 주면 SQL 파일의 한글이 깨진다

`.sql` 파일을 파이프로 넣을 때 `--default-character-set=utf8mb4` 를 빼면 클라이언트가
파일을 latin1 로 읽습니다. 문법 오류가 아니라 **조용히 깨진 값이 들어갑니다.**

```
enum('약국','병원')  →  enum('ì•½êµ­','ë³‘ì›')
분류 이름 '강아지'    →  'ê°•ì•„ì§€'
```

실제로 `createTables.sql` 로 새로 설치하면 users·categories 시드와 enum, 컬럼 주석이
전부 이렇게 됐습니다. 모든 `.sql` 적용 명령에 플래그가 들어 있는지 확인하세요.

```bash
docker exec -i petmedisearch-mysql mysql -uroot -p<암호> --default-character-set=utf8mb4 petmedisearch < scripts/<파일>.sql
```

### 6.3 일괄 치환이 한국어 조사를 깬다

`단골` → `즐겨찾기` 를 통째로 바꿨더니 `즐겨찾기이`, `즐겨찾기은`, `즐겨찾기을` 이
됐습니다. 받침이 바뀌면 조사도 바뀝니다. 치환 뒤 조사를 따로 훑습니다.

### 6.4 import 를 "마지막 import 줄" 뒤에 넣으면 안 된다

여러 줄짜리 import 블록 **안쪽**에 꽂혀 모듈이 깨집니다. 정확한 문자열 치환으로
넣고, Vite 가 그 모듈을 200 으로 주는지 확인합니다.

### 6.5 워크트리를 벗어나지 않는다

작업은 `.claude/worktrees/...` 안에서만 합니다. 베이스 체크아웃을 고치면 훅이
막습니다. 워크트리에는 `.env` 를 복사하고 `node_modules` 를 연결해 둡니다
(단, Turbopack 처럼 정션을 거부하는 도구는 실제 `npm ci` 가 필요합니다).

---

## 7. 끝났다고 말하기 전 점검표

1. `cd client && npm run build` — `tsc -b` 통과
2. `cd client && npm run lint` — 경고 0
3. 브라우저에서 **실제로 그 동작**을 해 봄 (로그인 → 클릭 → 화면 → 새로고침)
4. 네트워크 탭에서 요청/응답 확인
5. 시험하며 바꾼 데이터 원상복구
6. 성능에 관한 변경이면 **전/후 수치**를 같이 보고
7. 보고에는 한 것, 안 한 것, 확인 못 한 것을 나눠서 씀

---

## 8. 참고

| 항목 | 값 |
|---|---|
| JWT 페이로드 | `{ id, role }`, 유효기간 1일 |
| 비밀번호 해시 | bcrypt cost 12 |
| 요청 본문 상한 | 3mb (`server/app.js`) |
| 관리자 계정 만들기 | `cd server && npm run create-admin` |
| 회원가입 수집 항목 | 이름·전화번호·이메일·주소 |
| 지도 | Kakao Maps SDK, 클러스터링은 서버에서 격자로 |
