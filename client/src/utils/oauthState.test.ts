import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { issueOAuthState, verifyOAuthState } from './oauthState';

/*
 * 소셜 로그인 state.
 *
 * 이 값을 확인하지 않으면 공격자가 자기 계정의 인가 코드를 담은 링크를 피해자에게
 * 열게 해서, 피해자의 브라우저를 공격자 계정으로 로그인시킬 수 있습니다.
 * "맞으면 통과" 보다 "다르면 막는다" 쪽이 이 테스트의 핵심입니다.
 */

describe('oauthState', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('발급한 값이 그대로 돌아오면 통과한다', () => {
    const state = issueOAuthState('kakao');
    expect(verifyOAuthState('kakao', state)).toBe(true);
  });

  it('다른 값이 오면 막는다', () => {
    issueOAuthState('kakao');
    expect(verifyOAuthState('kakao', 'someone-elses-state')).toBe(false);
  });

  it('값이 아예 없이 오면 막는다', () => {
    issueOAuthState('kakao');
    expect(verifyOAuthState('kakao', null)).toBe(false);
  });

  it('한 번 쓴 값은 두 번 통하지 않는다', () => {
    const state = issueOAuthState('naver');
    expect(verifyOAuthState('naver', state)).toBe(true);
    // 같은 코드를 다시 흘려 보내는 재생을 막습니다.
    expect(verifyOAuthState('naver', state)).toBe(false);
  });

  it('제공자끼리 섞이지 않는다', () => {
    const kakao = issueOAuthState('kakao');
    issueOAuthState('naver');
    expect(verifyOAuthState('naver', kakao)).toBe(false);
  });

  it('발급할 때마다 다른 값이 나온다', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      seen.add(issueOAuthState('google'));
    }
    expect(seen.size).toBe(50);
  });

  it('추측하기 어려운 길이와 모양이어야 한다', () => {
    // Math.random() 으로 만들던 11자짜리를 대체한 것입니다.
    const state = issueOAuthState('google');
    expect(state).toMatch(/^[0-9a-f]{32}$/);
  });

  it('시작한 적 없는 로그인은 막는다', () => {
    /*
     * 이 앱이 막으려는 공격이 정확히 이 모양입니다. 공격자가 자기 인가 코드를
     * 담은 링크를 피해자에게 열게 하면, 피해자는 로그인을 시작한 적이 없어
     * 저장된 값도 없습니다. 여기서 통과시키면 검사가 아무 의미도 없습니다.
     */
    expect(verifyOAuthState('kakao', 'attacker-supplied')).toBe(false);
  });

  it('저장소가 막혀 있으면 막는다', () => {
    // 안전하게 만들 수 없는 로그인은 되게 하지 않습니다.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('읽기 불가');
    });
    expect(verifyOAuthState('kakao', 'anything')).toBe(false);
  });

  it('저장소가 막혀 있어도 발급은 실패하지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('저장 불가');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => issueOAuthState('kakao')).not.toThrow();
  });
});
