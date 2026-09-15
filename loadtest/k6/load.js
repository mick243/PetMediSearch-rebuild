/**
 * 부하 시험 — 동시 사용자 200명까지.
 *
 * 왜 200명인가.
 *   가입자 1만·DAU 2000 을 가정합니다. 하루 2000명이 고르게 오지는 않고 저녁에
 *   몰립니다. 한 사람이 5분쯤 머문다고 보면 붐비는 시간대의 동시 접속은 보통
 *   100명 안팎이고, 200명은 그 두 배입니다. "평소" 가 아니라 "제일 몰릴 때" 를
 *   견디는지 보는 숫자입니다.
 *
 * 한 번에 200명을 던지지 않고 50 → 100 → 200 으로 올립니다. 어디서부터 꺾이는지
 * 알아야 하기 때문입니다. 바로 200 을 걸면 "느리다" 만 남고 한계가 어디인지는
 * 모릅니다. 각 단계에서 2~3분 머무는 것은, 올리는 도중의 값은 아직 자리를 잡지
 * 않아서입니다 (풀이 채워지고 커넥션이 데워지는 구간).
 *
 *   $ k6 run loadtest/k6/load.js
 *   $ k6 run -e BASE_URL=http://10.0.0.5:8081 loadtest/k6/load.js
 */
import http from 'k6/http';
import { BASE_URL, FIXTURES, MARK, endpointThresholds, runOneJourney, think } from './lib/app.js';
import { report } from './lib/summary.js';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      /*
       * 시나리오를 하나만 둡니다.
       *
       * 여정마다 시나리오를 나누면 VU 가 시나리오별로 따로 잡혀 합이 200 을 넘습니다.
       * 여정은 시나리오가 아니라 안에서 확률로 고릅니다 (lib/app.js 의 MIX).
       */
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '3m', target: 200 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },

  /*
   * 본문을 들고 있지 않습니다.
   *
   * /facilities 한 번이 85KB, 후기 사진은 214KB 입니다. VU 200개가 저마다 들고
   * 있으면 k6 쪽이 먼저 힘들어져, 서버가 아니라 부하 도구를 재게 됩니다.
   * 내용이 맞는지는 smoke.js 가 봅니다. 흘러간 양은 그대로 집계됩니다.
   */
  discardResponseBodies: true,

  thresholds: Object.assign(
    {
      // 실패가 1%를 넘으면 사용자가 느낍니다. 429 도 여기 들어갑니다.
      http_req_failed: ['rate<0.01'],
      // 전체 p95. 화면별 예산은 lib/app.js 의 BUDGET_MS 에 따로 있습니다.
      http_req_duration: ['p(95)<1000'],
      // 요청 제한에 걸리면 이 시험은 서버가 아니라 express-rate-limit 을 잰 것이 됩니다.
      rate_limited: ['rate<0.005'],
      checks: ['rate>0.99'],
    },
    endpointThresholds()
  ),
};

export function setup() {
  const health = http.get(`${BASE_URL}/health`, { tags: { name: 'health' } });
  if (health.status !== 200) {
    throw new Error(`${BASE_URL}/health 가 ${health.status} 입니다. 서버를 먼저 띄우세요.`);
  }
  console.log(`대상: ${BASE_URL} · DB: ${FIXTURES.database} · 남기는 글에 붙는 표시: ${MARK}`);
  console.log('끝나면 server/scripts/loadtestCleanup.js 로 되돌리세요.');
}

export default function () {
  runOneJourney();
  // 다음 화면으로 넘어가기 전 뜸. 없으면 사람이 아니라 재시도 루프가 됩니다.
  think(1.0, 4.0);
}

export function handleSummary(data) {
  return {
    stdout: report(data, '부하 시험 (VU 0 → 200)'),
    'loadtest/results/load.json': JSON.stringify(data, null, 2),
  };
}
