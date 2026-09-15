/**
 * 결과를 화면별 표로 찍습니다.
 *
 * k6 의 기본 요약은 http_req_duration 을 전부 합친 한 줄입니다. 그 줄이 괜찮아도
 * 어느 화면 하나가 느린 것은 그대로 묻힙니다 — 실제로 무거운 건 늘 한둘입니다.
 * 그래서 name 태그별로 갈라 찍고, 원본은 JSON 으로 따로 남깁니다.
 */
import { BUDGET_MS } from './app.js';

const pad = (s, n) => String(s).padEnd(n);
const padLeft = (s, n) => String(s).padStart(n);
const ms = (v) => (v === undefined || v === null ? '-' : `${Math.round(v)}`);
const pct = (v) => (v === undefined || v === null ? '-' : `${(v * 100).toFixed(2)}%`);

function mib(bytes) {
  if (!bytes) return '0';
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 임계값이 붙은 하위 지표는 이름이 'metric{tag:value}' 모양으로 들어옵니다. */
function sub(metrics, metric, name) {
  return metrics[`${metric}{name:${name}}`];
}

/**
 * 깨진 체크의 이름.
 *
 * "체크 97.5% 통과" 만으로는 무엇이 깨졌는지 알 수 없어, 부하를 다시 걸어 가며
 * 찾게 됩니다. 실제로 /pets 가 500 을 내는 것을 이 줄이 없어서 한 번 놓쳤습니다.
 */
function failedChecks(data) {
  const found = [];

  const walk = (group) => {
    if (!group) return;
    for (const c of group.checks || []) {
      if (c.fails > 0) found.push({ name: c.name, fails: c.fails, passes: c.passes });
    }
    for (const child of group.groups || []) walk(child);
  };

  walk(data.root_group);
  return found;
}

export function report(data, title) {
  const m = data.metrics;
  const lines = [];

  lines.push('');
  lines.push(`=== ${title} ===`);
  lines.push('');

  /* 화면별 ------------------------------------------------------- */
  lines.push(
    `${pad('화면', 20)}${padLeft('건수', 8)}${padLeft('p50', 8)}${padLeft('p95', 8)}` +
      `${padLeft('최대', 9)}${padLeft('예산', 8)}  판정`
  );
  lines.push('-'.repeat(75));

  const overBudget = [];
  for (const name of Object.keys(BUDGET_MS)) {
    const duration = sub(m, 'http_req_duration', name);
    const reqs = sub(m, 'http_reqs', name);
    if (!duration || !reqs || !reqs.values.count) continue;

    const p95 = duration.values['p(95)'];
    const budget = BUDGET_MS[name];
    const ok = p95 <= budget;
    if (!ok) overBudget.push({ name, p95, budget });

    lines.push(
      `${pad(name, 20)}${padLeft(reqs.values.count, 8)}` +
        `${padLeft(ms(duration.values.med), 8)}${padLeft(ms(p95), 8)}` +
        `${padLeft(ms(duration.values.max), 9)}${padLeft(budget, 8)}  ${ok ? 'OK' : '초과'}`
    );
  }

  /* 전체 --------------------------------------------------------- */
  const total = m.http_reqs ? m.http_reqs.values.count : 0;
  const seconds = data.state && data.state.testRunDurationMs
    ? data.state.testRunDurationMs / 1000
    : null;

  lines.push('');
  lines.push('--- 전체 ---');
  lines.push(`최대 VU        : ${m.vus_max ? m.vus_max.values.max : '-'}`);
  lines.push(`요청           : ${total}건${seconds ? ` (${(total / seconds).toFixed(1)} req/s)` : ''}`);
  if (seconds) lines.push(`걸린 시간      : ${Math.round(seconds)}초`);
  if (m.http_req_duration) {
    const v = m.http_req_duration.values;
    lines.push(
      `응답시간       : p50 ${ms(v.med)}ms · p90 ${ms(v['p(90)'])}ms · ` +
        `p95 ${ms(v['p(95)'])}ms · 최대 ${ms(v.max)}ms`
    );
  }
  if (m.journey_server_time) {
    const v = m.journey_server_time.values;
    lines.push(`화면 하나 합계 : p50 ${ms(v.med)}ms · p95 ${ms(v['p(95)'])}ms (생각하는 시간 제외)`);
  }
  /*
   * Rate 지표의 passes 는 "참이었던 횟수" 입니다.
   * http_req_failed 에서 참은 곧 실패한 요청이라, 여기서 봐야 할 것은 fails 가
   * 아니라 passes 입니다 — 뒤집어 읽으면 26건 중 1건 실패가 25건으로 나옵니다.
   */
  if (m.http_req_failed) {
    const v = m.http_req_failed.values;
    lines.push(`실패           : ${pct(v.rate)} (${v.passes ?? 0}건)`);
  }
  if (m.rate_limited) {
    const v = m.rate_limited.values;
    lines.push(`요청제한 429   : ${pct(v.rate)} (${v.passes ?? 0}건)`);
  }
  if (m.checks) {
    const v = m.checks.values;
    lines.push(`체크 통과      : ${pct(v.rate)} (${v.fails ?? 0}건 실패)`);
  }
  if (m.data_received) lines.push(`받은 양        : ${mib(m.data_received.values.count)}`);
  if (m.iterations) lines.push(`여정           : ${m.iterations.values.count}회`);

  /* 깨진 체크 ---------------------------------------------------- */
  const broken = failedChecks(data);
  if (broken.length > 0) {
    lines.push('');
    lines.push('깨진 체크:');
    for (const c of broken) lines.push(`  ${c.name} — ${c.fails}건 실패 / ${c.passes}건 통과`);
  }

  /* 예산 초과 ---------------------------------------------------- */
  lines.push('');
  if (overBudget.length === 0) {
    lines.push('예산을 넘긴 화면 없음.');
  } else {
    lines.push('예산 초과:');
    for (const o of overBudget) {
      lines.push(`  ${pad(o.name, 20)} p95 ${ms(o.p95)}ms (예산 ${o.budget}ms, ${(o.p95 / o.budget).toFixed(1)}배)`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
