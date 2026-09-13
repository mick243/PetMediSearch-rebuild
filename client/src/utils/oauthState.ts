/*
 * 소셜 로그인의 state 값.
 *
 * 예전에는 네이버 버튼만 `Math.random()` 으로 state 를 만들어 보냈고, 돌아온 값을
 * 아무도 확인하지 않았습니다. 카카오·구글은 state 자체가 없었습니다.
 *
 * 확인하지 않으면 공격자가 자기 계정의 인가 코드를 담은 링크를 피해자에게 열게 해서,
 * 피해자의 브라우저를 공격자 계정으로 로그인시킬 수 있습니다(로그인 CSRF).
 * 그 상태로 피해자가 남긴 글이나 반려동물 정보는 공격자 계정에 쌓입니다.
 *
 * 나갈 때 만든 값을 sessionStorage 에 두고, 돌아왔을 때 같은 값인지 봅니다.
 * sessionStorage 는 탭 단위라 다른 탭에서 시작한 로그인과 섞이지 않습니다.
 */

export type OAuthProvider = 'kakao' | 'naver' | 'google';

const key = (provider: OAuthProvider) => `oauth_state_${provider}`;

/** 추측할 수 없는 값이어야 합니다. Math.random() 은 그 용도로 만든 게 아닙니다. */
function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 로그인 화면을 떠나기 직전에 부릅니다. 만든 값을 보관하고 그대로 돌려줍니다. */
export function issueOAuthState(provider: OAuthProvider): string {
  const state = randomState();
  try {
    sessionStorage.setItem(key(provider), state);
  } catch (error) {
    // 저장이 막힌 브라우저(사생활 보호 모드 등)에서도 로그인 자체는 되게 둡니다.
    console.warn('state 를 저장하지 못했습니다:', error);
  }
  return state;
}

/**
 * 돌아왔을 때 부릅니다. 맞으면 true 이고, 한 번 쓴 값은 지웁니다.
 *
 * 저장해 둔 값이 아예 없으면 통과시킵니다. 저장이 막힌 브라우저에서 로그인이
 * 영영 안 되는 쪽이 더 나쁩니다. 값이 있는데 다르면 막습니다 — 그건 실수가 아닙니다.
 */
export function verifyOAuthState(
  provider: OAuthProvider,
  received: string | null
): boolean {
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(key(provider));
    sessionStorage.removeItem(key(provider));
  } catch {
    return true;
  }

  if (!saved) return true;
  return saved === received;
}
