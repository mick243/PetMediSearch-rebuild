/**
 * 부하테스트 공통 부분 — 대상 주소, 사용자 여정, 측정 지표.
 *
 * smoke.js 와 load.js 가 같은 여정을 씁니다. 연습용 경로를 따로 두면 실제로 재는
 * 것과 달라지고, 그 차이가 어디서 났는지 나중에 알 수 없습니다.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';

/** server/scripts/loadtestCleanup.js 의 LOADTEST_MARK 와 같은 값이어야 합니다. 이 표시로만 지웁니다. */
export const MARK = '[k6]';

/** id 목록 몇 개짜리 작은 파일. VU 마다 들고 있어도 부담이 없습니다. */
export const FIXTURES = JSON.parse(open('../../.data/fixtures.json'));

/*
 * 계정 400개는 토큰이 붙어 100KB 가 넘습니다.
 *
 * SharedArray 는 원본을 한 벌만 두고 VU 는 꺼내 쓸 때만 그 항목을 복사합니다.
 * 평범한 배열로 두면 VU 200개가 저마다 400개를 통째로 들고 있게 됩니다.
 * 그래서 배열 전체를 변수에 받아 두면 안 되고, 늘 첨자로 하나씩 꺼내 씁니다.
 */
const USERS = new SharedArray('users', () => JSON.parse(open('../../.data/users.json')));

/*
 * 429 는 서버가 죽은 게 아니라 요청 제한이 막은 것입니다.
 * http_req_failed 에만 섞이면 "서버가 못 버텼다" 로 잘못 읽히므로 따로도 셉니다.
 */
export const rateLimited = new Rate('rate_limited');
/**
 * 화면 하나를 끝까지 보는 데 서버가 쓴 시간의 합.
 * 사람이 화면을 보는 시간(sleep)은 빼야 "서버가 얼마나 기다리게 했는지" 가 남습니다.
 */
export const journeyServerTime = new Trend('journey_server_time', true);

/** runOneJourney 가 한 여정 동안 쌓습니다. */
let serverTimeAcc = 0;

/**
 * VU 마다 다른 클라이언트 주소를 붙입니다.
 *
 * 요청 제한이 주소 단위(1분에 300번)라, 한 대에서 200 VU 를 돌리면 전부 한 사람으로
 * 묶여 30초도 안 돼 429 만 돌아옵니다. 그러면 재고 있는 것은 서버 성능이 아니라
 * express-rate-limit 의 처리 속도입니다.
 *
 * 서버를 TRUST_PROXY=1 로 띄우면 이 헤더가 곧 req.ip 가 되어, VU 하나가 사용자
 * 한 명으로 셉니다. 운영도 프록시 뒤에 있어 같은 경로를 탑니다.
 */
export function clientHeaders(extra) {
  return Object.assign(
    { 'X-Forwarded-For': `10.${Math.floor(__VU / 250)}.${__VU % 250}.7` },
    extra || {}
  );
}

export function authHeaders(user) {
  return clientHeaders({
    Authorization: `Bearer ${user.token}`,
    'Content-Type': 'application/json',
  });
}

/**
 * 요청 한 번.
 *
 * name 태그로 묶어야 결과가 주소별이 아니라 화면별로 나옵니다 — 안 붙이면
 * /posts/1 과 /posts/2 가 서로 다른 줄이 되어 표가 2만 줄이 됩니다.
 */
export function get(path, name, headers) {
  return record(
    http.get(`${BASE_URL}${path}`, { headers: headers || clientHeaders(), tags: { name } }),
    name
  );
}

export function post(path, body, name, headers) {
  return record(
    http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
      headers: headers || clientHeaders({ 'Content-Type': 'application/json' }),
      tags: { name },
    }),
    name
  );
}

function record(res, name) {
  serverTimeAcc += res.timings.duration;
  rateLimited.add(res.status === 429, { name });
  check(res, { [`${name}: 2xx`]: (r) => r.status >= 200 && r.status < 300 });
  return res;
}

const randomIndex = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randomIndex(arr.length)];
const between = (a, b) => a + Math.random() * (b - a);

/** 사람이 화면을 보는 시간. 이게 없으면 사용자가 아니라 스크래퍼를 흉내 내게 됩니다. */
export function think(min, max) {
  sleep(between(min, max));
}

/**
 * 지도를 여는 지역.
 *
 * 전국을 고르게 두드리면 실제와 다릅니다. 시설도 사용자도 수도권에 몰려 있어,
 * 서울·경기 상자를 여러 번 넣어 그쪽이 더 자주 나오게 했습니다.
 */
const AREAS = [
  { lat: 37.5665, lng: 126.978 }, // 서울
  { lat: 37.5665, lng: 126.978 },
  { lat: 37.5665, lng: 126.978 },
  { lat: 37.2911, lng: 127.0089 }, // 경기
  { lat: 37.2911, lng: 127.0089 },
  { lat: 37.4563, lng: 126.7052 }, // 인천
  { lat: 35.1796, lng: 129.0756 }, // 부산
  { lat: 35.8714, lng: 128.6014 }, // 대구
  { lat: 36.3504, lng: 127.3845 }, // 대전
  { lat: 35.1595, lng: 126.8526 }, // 광주
  { lat: 33.4996, lng: 126.5312 }, // 제주
];

const boxAround = (area, half) =>
  `swLat=${(area.lat - half).toFixed(4)}&swLng=${(area.lng - half).toFixed(4)}` +
  `&neLat=${(area.lat + half).toFixed(4)}&neLng=${(area.lng + half).toFixed(4)}`;

/* ------------------------------------------------------------------ *
 * 여정 ①  지도에서 병원 찾기
 *
 * 화면을 넓게 열었다가(클러스터) 한 곳으로 좁히고(개별 마커) 후기를 봅니다.
 * 이 앱에서 제일 자주 도는 길이고, 쿼리도 제일 무겁습니다.
 * ------------------------------------------------------------------ */
export function mapSearch() {
  const area = pick(AREAS);

  // 넓은 줌 — 서버가 격자로 묶어 개수만 내려줍니다.
  get(`/facilities/clusters?${boxAround(area, 0.35)}&precision=1`, 'clusters');
  think(0.8, 2.5);

  // 좁힌 줌 — 개별 시설. 화면이 마커를 그리는 구간입니다.
  get(`/facilities?${boxAround(area, 0.04)}&limit=300`, 'facilities-bbox');
  think(0.8, 2.5);

  // 열 번에 세 번은 검색어를 칩니다.
  if (Math.random() < 0.3) {
    get(`/facilities?keyword=${encodeURIComponent('동물병원')}&limit=50`, 'facilities-keyword');
    think(0.5, 1.5);
  }

  /*
   * 후기 보기. 열 번에 두 번은 후기가 몰린 곳을 엽니다.
   * 유명한 병원 한 곳에 쏠리는 실제 모양이고, 여기가 제일 느립니다.
   */
  const facilityId = Math.random() < 0.2 ? FIXTURES.hotFacilityId : pick(FIXTURES.facilityIds);
  get(`/reviews/facility/${facilityId}?page=1&limit=5`, 'reviews-list');

  // 목록에는 장수만 오므로, 펼쳐 볼 때 사진을 따로 받아갑니다.
  if (Math.random() < 0.25 && FIXTURES.reviewIdsWithImages.length > 0) {
    think(0.5, 1.5);
    get(`/reviews/${pick(FIXTURES.reviewIdsWithImages)}/images`, 'review-images');
  }
}

/* ------------------------------------------------------------------ *
 * 여정 ②  커뮤니티 읽기
 * ------------------------------------------------------------------ */
export function community() {
  get('/category', 'category-list');
  think(0.3, 1.0);

  get(
    `/category?category=${pick(FIXTURES.categoryIds)}&page=${1 + randomIndex(5)}&limit=10`,
    'category-posts'
  );
  think(1.0, 3.0);

  // 열 번에 두 번은 댓글이 몰린 글을 엽니다.
  const postId = Math.random() < 0.2 ? FIXTURES.hotPostId : pick(FIXTURES.postIds);
  get(`/posts/${postId}`, 'post-detail');
  get(`/comments/${postId}?page=1&limit=5`, 'comments-page');

  if (Math.random() < 0.3) {
    think(1.0, 2.5);
    get(`/comments/${postId}?page=2&limit=5`, 'comments-page');
  }
}

/* ------------------------------------------------------------------ *
 * 여정 ③  마이페이지 (로그인한 사람)
 * ------------------------------------------------------------------ */
export function myPage() {
  const headers = authHeaders(USERS[randomIndex(FIXTURES.userCount)]);

  get('/mypage/posts', 'mypage-posts', headers);
  get('/mypage/comments', 'mypage-comments', headers);
  think(0.5, 1.5);
  get('/mypage/reviews', 'mypage-reviews', headers);
  get('/favorites', 'favorites', headers);
  think(0.5, 1.5);
  get('/pets', 'pets', headers);
}

/* ------------------------------------------------------------------ *
 * 여정 ④  로그인
 *
 * bcrypt cost 12 는 한 번에 0.3초쯤 CPU 를 씁니다. Node 는 한 줄로 돌아서
 * 로그인이 몰리면 그동안 다른 요청이 전부 기다립니다. 비중은 작게 두되
 * 빼지는 않습니다 — 빼면 그 영향이 아예 안 보입니다.
 *
 * 앞쪽 loginUserCount 명만 비밀번호가 진짜라, 그 안에서만 고릅니다.
 * ------------------------------------------------------------------ */
export function login() {
  const user = USERS[randomIndex(FIXTURES.loginUserCount)];
  return post('/auth/login', { email: user.email, password: FIXTURES.password }, 'login');
}

/* ------------------------------------------------------------------ *
 * 여정 ⑤  글 남기기
 *
 * 본문 앞에 MARK 를 붙입니다. 정리 스크립트가 이 표시만 보고 지웁니다.
 * ------------------------------------------------------------------ */
export function write() {
  const headers = authHeaders(USERS[randomIndex(FIXTURES.userCount)]);

  if (Math.random() < 0.6) {
    post(
      '/comments',
      { post_id: pick(FIXTURES.postIds), content: `${MARK} 부하테스트 댓글 ${Date.now()}` },
      'comment-create',
      headers
    );
  } else {
    post(
      '/reviews',
      {
        facility_id: pick(FIXTURES.facilityIds),
        rating: 1 + randomIndex(5),
        review_content: `${MARK} 부하테스트 후기 ${Date.now()}`,
      },
      'review-create',
      headers
    );
  }
}

/**
 * 여정 비율.
 *
 * DAU 2000 규모에서 사람들이 실제로 하는 비율에 맞춥니다. 대부분은 병원을 찾거나
 * 글을 읽고, 쓰는 사람은 훨씬 적습니다. 쓰기만 잔뜩 돌리면 실제로는 나지 않는
 * 잠금 경합을 만들고, 읽기만 돌리면 INSERT 가 목록 인덱스에 주는 부담을 놓칩니다.
 */
export const MIX = [
  { weight: 45, name: 'map-search', run: mapSearch },
  { weight: 30, name: 'community', run: community },
  { weight: 15, name: 'my-page', run: myPage },
  { weight: 6, name: 'login', run: login },
  { weight: 4, name: 'write', run: write },
];

/**
 * 화면별 응답시간 예산 (p95, ms).
 *
 * "빠르면 좋다" 로는 통과·실패를 가릴 수 없어 미리 숫자를 박아 둡니다.
 * 기준은 화면이 그 응답을 기다리는 동안 사용자가 무엇을 보고 있는지입니다 —
 * 지도는 이미 그려진 채로 마커만 늦게 찍히지만, 글 목록은 빈 화면입니다.
 *
 * 로그인만 유독 넉넉한 것은 bcrypt cost 12 자체가 0.3초쯤 쓰기 때문입니다.
 * 사진이 붙는 둘(review-images·mypage-reviews)은 200KB 넘게 흐르는 구간입니다.
 */
export const BUDGET_MS = {
  'category-list': 300,
  'category-posts': 600,
  'post-detail': 400,
  'comments-page': 600,
  clusters: 1500,
  'facilities-bbox': 800,
  'facilities-keyword': 1000,
  'reviews-list': 500,
  'review-images': 1500,
  'mypage-posts': 500,
  'mypage-comments': 500,
  'mypage-reviews': 1500,
  favorites: 500,
  pets: 800,
  login: 2000,
  'comment-create': 800,
  'review-create': 800,
};

/**
 * 화면별 통계는 임계값을 걸어 둬야 k6 가 따로 모아 줍니다.
 * 걸지 않으면 요약에 전체 평균 한 줄만 남아, 무엇이 느린지 알 수 없습니다.
 */
export function endpointThresholds() {
  const thresholds = {};
  for (const [name, budget] of Object.entries(BUDGET_MS)) {
    thresholds[`http_req_duration{name:${name}}`] = [`p(95)<${budget}`];
    // 통계를 뽑으려고 거는 것이라 사실상 늘 통과하는 조건입니다.
    thresholds[`http_reqs{name:${name}}`] = ['count>=0'];
  }
  return thresholds;
}

export function runOneJourney() {
  const roll = Math.random() * 100;
  let acc = 0;

  for (const journey of MIX) {
    acc += journey.weight;
    if (roll >= acc) continue;

    serverTimeAcc = 0;
    journey.run();
    journeyServerTime.add(serverTimeAcc, { journey: journey.name });
    return journey.name;
  }

  return null;
}
