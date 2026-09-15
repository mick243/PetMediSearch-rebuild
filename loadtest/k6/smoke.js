/**
 * 연기 시험 — 사용자 한 명으로 모든 경로를 한 번씩.
 *
 * 두 가지를 합니다.
 *
 *   ① 부하를 걸기 전에 응답이 실제로 맞는지 봅니다. 200 만 보고 넘어가면,
 *      전부 "서버 오류 발생" 을 200 으로 돌려주고 있어도 통과합니다.
 *
 *   ② 혼자일 때의 응답시간을 남깁니다. 이게 있어야 200명일 때의 숫자가
 *      "원래 그만큼 걸리는 것" 인지 "몰려서 느려진 것" 인지 갈립니다.
 *
 *   $ k6 run loadtest/k6/smoke.js
 */
import http from 'k6/http';
import { check } from 'k6';
import {
  BASE_URL, FIXTURES, MARK, get, clientHeaders, authHeaders,
  mapSearch, community, myPage, login, write, endpointThresholds,
} from './lib/app.js';
import { report } from './lib/summary.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: Object.assign({ http_req_failed: ['rate<0.01'] }, endpointThresholds()),
};

/**
 * 일부러 실패시키는 요청.
 *
 * 그냥 부르면 401·404 가 http_req_failed 에 쌓여 "서버가 1/3 을 실패했다" 로 나옵니다.
 * 기대하는 상태 코드를 미리 알려 줘, 그대로 오면 정상으로 셉니다.
 */
function expecting(status, request) {
  return request(http.expectedStatuses(status));
}

/** 응답 본문까지 보는 검사. 부하 시험은 상태 코드만 보므로 여기서 한 번 제대로 봅니다. */
function contract() {
  const list = get('/category?category=1&page=1&limit=10', 'category-posts');
  const page = list.json();
  check(list, {
    '글 목록: { posts, total } 모양': () => Array.isArray(page.posts) && typeof page.total === 'number',
    '글 목록: limit 만큼만 옴': () => page.posts.length <= 10,
    '글 목록: total 이 실제 규모': () => page.total > 1000,
  });

  const big = get('/category?category=1&page=1&limit=100000', 'category-posts');
  check(big, {
    '글 목록: limit 상한을 서버가 걸음 (50)': (r) => r.json().posts.length <= 50,
  });

  const comments = get(`/comments/${FIXTURES.hotPostId}?page=1&limit=5`, 'comments-page');
  const thread = comments.json();
  check(comments, {
    '댓글: { comments, total, count } 모양': () =>
      Array.isArray(thread.comments) &&
      typeof thread.total === 'number' &&
      typeof thread.count === 'number',
    '댓글: 스레드 전체를 한 번에 주지 않음': () => comments.body.length < 20000,
  });

  const reviews = get(`/reviews/facility/${FIXTURES.hotFacilityId}?page=1&limit=5`, 'reviews-list');
  const reviewPage = reviews.json();
  check(reviews, {
    '후기: { reviews, total } 모양': () =>
      Array.isArray(reviewPage.reviews) && typeof reviewPage.total === 'number',
    '후기: 목록에 사진이 실리지 않음': () => reviewPage.reviews.every((r) => r.images === undefined),
    '후기: 장수만 옴 (image_count)': () =>
      reviewPage.reviews.every((r) => typeof r.image_count === 'number'),
  });

  const images = get(`/reviews/${FIXTURES.reviewIdsWithImages[0]}/images`, 'review-images');
  check(images, {
    '사진: 펼칠 때 따로 받아짐': (r) => {
      const body = r.json();
      return Array.isArray(body) || Array.isArray(body.images);
    },
  });

  const clusters = get(
    '/facilities/clusters?swLat=37.2&swLng=126.7&neLat=37.9&neLng=127.3&precision=1',
    'clusters'
  );
  check(clusters, {
    '클러스터: 격자별 개수가 옴': (r) => {
      const rows = r.json();
      return Array.isArray(rows) && rows.length > 0 && typeof rows[0].count === 'number';
    },
  });

  const bbox = get(
    '/facilities?swLat=37.50&swLng=126.95&neLat=37.55&neLng=127.02&limit=300',
    'facilities-bbox'
  );
  check(bbox, {
    '시설: 화면 범위만, limit 안으로': (r) => {
      const rows = r.json();
      return Array.isArray(rows) && rows.length > 0 && rows.length <= 300;
    },
  });

  const loggedIn = login();
  check(loggedIn, {
    '로그인: 토큰이 옴': (r) => r.status === 200 && typeof r.json().token === 'string',
    '로그인: 비밀번호 해시를 내보내지 않음': (r) => r.body.indexOf('$2b$') === -1,
  });

  /* --- 여기서부터는 실패하는 게 정상인 요청들 --- */

  const badToken = expecting(401, (cb) =>
    http.get(`${BASE_URL}/mypage/posts`, {
      headers: authHeaders({ token: 'not-a-token' }),
      tags: { name: 'mypage-posts' },
      responseCallback: cb,
    })
  );
  check(badToken, { '마이페이지: 엉터리 토큰은 401': (r) => r.status === 401 });

  const wrong = expecting(401, (cb) =>
    http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password' }),
      {
        headers: clientHeaders({ 'Content-Type': 'application/json' }),
        tags: { name: 'login' },
        responseCallback: cb,
      }
    )
  );
  check(wrong, {
    '로그인 실패: 401': (r) => r.status === 401,
    '로그인 실패: 없는 계정인지 알려주지 않음': (r) =>
      r.json().message === '이메일 또는 비밀번호가 올바르지 않습니다.',
  });

  const notFound = expecting(404, (cb) =>
    http.get(`${BASE_URL}/no-such-route`, {
      headers: clientHeaders(),
      tags: { name: 'not-found' },
      responseCallback: cb,
    })
  );
  check(notFound, {
    '없는 주소: HTML 이 아니라 JSON 404': (r) =>
      r.status === 404 && typeof r.json().message === 'string',
  });
}

export function setup() {
  const health = http.get(`${BASE_URL}/health`, { tags: { name: 'health' } });
  if (health.status !== 200) {
    throw new Error(`${BASE_URL}/health 가 ${health.status} 입니다. 서버를 먼저 띄우세요.`);
  }
  console.log(`대상: ${BASE_URL} · DB: ${FIXTURES.database} · 남기는 글에 붙는 표시: ${MARK}`);
}

export default function () {
  contract();

  // 부하 시험이 도는 길을 그대로 한 번씩 밟아 봅니다.
  mapSearch();
  community();
  myPage();
  write();
}

export function handleSummary(data) {
  return {
    stdout: report(data, '연기 시험 (VU 1) — 혼자일 때의 응답시간'),
    'loadtest/results/smoke.json': JSON.stringify(data, null, 2),
  };
}
