/*
 * TRUST_PROXY 환경변수를 Express 의 'trust proxy' 설정값으로 바꿉니다.
 *
 * app.ts 에 두지 않은 이유는 search.ts 와 같습니다. app.ts 는 require 하는 순간 서버가
 * 떠서 테스트에서 부를 수 없습니다.
 *
 * 요청 제한(middleware/rateLimit.ts)은 사용자를 주소(req.ip)로 셉니다. 이 설정이 앞에
 * 실제로 놓인 프록시와 어긋나면, 모두가 한 주소로 묶이거나 한도가 제 역할을 못 합니다.
 * 그래서 값은 좁게 받고, 뜻이 모호한 값은 서버를 띄우지 않습니다.
 *
 * 예전에는 `Number(TRUST_PROXY) || 1` 이었습니다. 숫자가 아닌 값과 0 이 전부 1 이 되어,
 * 끄려고 TRUST_PROXY=0 이나 false 를 적어도 오히려 켜졌습니다.
 */

/** 끈다는 뜻으로 받는 값. */
const OFF = new Set(['', '0', 'false', 'off', 'no']);

/**
 * @param {string | undefined} raw TRUST_PROXY 값
 * @returns {false | number | string[]} false 면 설정하지 않습니다. 숫자는 앞에 놓인
 *   프록시 수, 배열은 프록시로 믿을 주소(loopback · uniquelocal 같은 이름이나 IP · CIDR)입니다.
 */
function parseTrustProxy(raw: string | undefined): false | number | string[] {
  const text = String(raw ?? '').trim().toLowerCase();

  if (OFF.has(text)) return false;
  if (/^\d+$/.test(text)) return Number(text);

  /*
   * true 는 앞에 무엇이 있든 전부 프록시로 믿는다는 뜻입니다. 그러면 요청 제한이
   * 사용자를 구분하지 못합니다. express-rate-limit 도 이 값에는 경고를 냅니다.
   */
  if (text === 'true' || text === 'yes' || text === 'on') {
    throw new Error('TRUST_PROXY 에 true 는 쓸 수 없습니다. 앞에 놓인 프록시 수(보통 1)나 프록시 주소를 적으세요.');
  }

  // 주소 목록은 Express 가 app.set 할 때 하나씩 검사해, 틀리면 그 자리에서 오류를 냅니다.
  return text.split(',').map((part) => part.trim()).filter(Boolean);
}

export { parseTrustProxy };
