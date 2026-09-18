import { describe, it, expect, beforeEach } from 'vitest';
import { isSafeNext, nextFrom, rememberNext, takeNext } from './afterLogin';

/*
 * 여기가 뚫리면 로그인 링크 하나로 사용자를 바깥 주소로 튕겨 보낼 수 있습니다.
 * 로그인 직후라 사용자는 우리 화면이라고 믿는 순간입니다.
 */
describe('isSafeNext', () => {
  it('우리 앱 안의 자리만 받는다', () => {
    expect(isSafeNext('/posts/1')).toBe(true);
    expect(isSafeNext('/posts?page=2')).toBe(true);
  });

  it('바깥 주소는 막는다', () => {
    expect(isSafeNext('https://evil.example')).toBe(false);
    expect(isSafeNext('//evil.example')).toBe(false);
    expect(isSafeNext('/\\evil.example')).toBe(false);
    expect(isSafeNext('javascript:alert(1)')).toBe(false);
  });

  it('값이 없으면 막는다', () => {
    expect(isSafeNext(null)).toBe(false);
    expect(isSafeNext('')).toBe(false);
  });
});

describe('nextFrom', () => {
  it('쿼리스트링까지 살린다', () => {
    expect(nextFrom({ pathname: '/posts', search: '?categoryId=2' })).toBe(
      '/posts?categoryId=2'
    );
    expect(nextFrom({ pathname: '/posts/1', search: '' })).toBe('/posts/1');
  });
});

describe('rememberNext / takeNext', () => {
  beforeEach(() => sessionStorage.clear());

  it('맡긴 자리를 한 번만 돌려준다', () => {
    rememberNext('/posts/1');
    expect(takeNext()).toBe('/posts/1');
    // 두 번째부터는 없습니다. 다음 로그인이 옛 자리로 끌려가면 안 됩니다.
    expect(takeNext()).toBe(null);
  });

  it('돌아갈 자리가 없으면 남아 있던 값을 치운다', () => {
    rememberNext('/posts/1');
    rememberNext(null);
    expect(takeNext()).toBe(null);
  });

  it('바깥 주소는 맡아 두지 않는다', () => {
    rememberNext('https://evil.example');
    expect(takeNext()).toBe(null);
  });
});
