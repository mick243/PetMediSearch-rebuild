import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readLastSearchView, saveLastSearchView } from './lastSearchView';

const KEY = 'petmedi:lastSearchView';

/*
 * 이 값이 깨져 있으면 위치 권한이 없는 사람의 지도가 엉뚱한 곳(또는 빈 타일)에서
 * 열립니다. 저장소는 사용자가 손댈 수도 있어 읽을 때 한 번 더 봅니다.
 */
describe('lastSearchView', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('검색으로 옮긴 화면을 그대로 돌려준다', () => {
    saveLastSearchView({ lat: 35.1631, lng: 129.1636, level: 5 });
    expect(readLastSearchView()).toEqual({
      lat: 35.1631,
      lng: 129.1636,
      level: 5,
    });
  });

  it('나중 검색이 앞의 것을 덮는다', () => {
    saveLastSearchView({ lat: 35.1631, lng: 129.1636, level: 5 });
    saveLastSearchView({ lat: 37.8813, lng: 127.7298, level: 3 });
    expect(readLastSearchView()).toEqual({
      lat: 37.8813,
      lng: 127.7298,
      level: 3,
    });
  });

  it('기록이 없으면 null', () => {
    expect(readLastSearchView()).toBeNull();
  });

  it('(0,0) 이나 범위 밖 좌표는 저장하지 않는다', () => {
    saveLastSearchView({ lat: 0, lng: 0, level: 5 });
    saveLastSearchView({ lat: 91, lng: 127, level: 5 });
    saveLastSearchView({ lat: Number.NaN, lng: 127, level: 5 });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('확대 단계는 1~14 의 정수만 받는다', () => {
    saveLastSearchView({ lat: 37.5, lng: 127, level: 0 });
    saveLastSearchView({ lat: 37.5, lng: 127, level: 15 });
    saveLastSearchView({ lat: 37.5, lng: 127, level: 4.5 });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('저장소의 값이 깨져 있으면 null', () => {
    localStorage.setItem(KEY, '{not json');
    expect(readLastSearchView()).toBeNull();

    localStorage.setItem(
      KEY,
      JSON.stringify({ lat: '37.5', lng: 127, level: 5 })
    );
    expect(readLastSearchView()).toBeNull();

    localStorage.setItem(KEY, JSON.stringify({ lat: 0, lng: 0, level: 5 }));
    expect(readLastSearchView()).toBeNull();
  });

  it('저장소를 쓸 수 없어도 화면을 깨뜨리지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() =>
      saveLastSearchView({ lat: 37.5, lng: 127, level: 5 })
    ).not.toThrow();
    expect(readLastSearchView()).toBeNull();
  });
});
