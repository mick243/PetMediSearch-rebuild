/**
 * 한 단계만 — 정해진 VU 수로 일정 시간.
 *
 * load.js 는 0 에서 200 까지 올리며 도는데, 끝나고 나오는 요약은 그 전부를 한 덩어리로
 * 평균 냅니다. 50명일 때의 빠른 값이 섞여 들어가 200명일 때가 실제보다 좋아 보입니다.
 *
 * 어느 인원에서 꺾이는지 보려면 인원을 고정하고 따로 재야 합니다.
 *
 *   $ k6 run -e VUS=50  loadtest/k6/step.js
 *   $ k6 run -e VUS=100 loadtest/k6/step.js
 *   $ k6 run -e VUS=200 loadtest/k6/step.js
 *
 * 결과 파일은 인원별로 따로 남습니다 (loadtest/results/step-<VUS>.json).
 */
import http from 'k6/http';
import { BASE_URL, FIXTURES, endpointThresholds, runOneJourney, think } from './lib/app.js';
import { report } from './lib/summary.js';

const VUS = Number(__ENV.VUS) || 50;
const DURATION = __ENV.DURATION || '2m';

export const options = {
  scenarios: {
    step: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '20s',
    },
  },
  discardResponseBodies: true,
  thresholds: Object.assign(
    {
      http_req_failed: ['rate<0.01'],
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
  console.log(`대상: ${BASE_URL} · DB: ${FIXTURES.database} · ${VUS} VU · ${DURATION}`);
}

export default function () {
  runOneJourney();
  think(1.0, 4.0);
}

export function handleSummary(data) {
  return {
    stdout: report(data, `단계 시험 — ${VUS} VU · ${DURATION}`),
    [`loadtest/results/step-${VUS}.json`]: JSON.stringify(data, null, 2),
  };
}
