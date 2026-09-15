import { describe, expect, it } from 'vitest';
import {
  canStartPull,
  PULL_MAX,
  PULL_THRESHOLD,
  pullDistance,
  shouldRefresh,
} from './pullToRefresh';

describe('pullDistance', () => {
  it('위로 밀거나 움직이지 않으면 0', () => {
    expect(pullDistance(0)).toBe(0);
    expect(pullDistance(-40)).toBe(0);
  });

  it('손가락 이동의 절반만 따라오고 상한에서 멈춘다', () => {
    expect(pullDistance(100)).toBe(50);
    expect(pullDistance(10_000)).toBe(PULL_MAX);
  });

  it('기준선을 넘어야 새로고침', () => {
    expect(shouldRefresh(PULL_THRESHOLD - 1)).toBe(false);
    expect(shouldRefresh(PULL_THRESHOLD)).toBe(true);
  });
});

describe('canStartPull', () => {
  const mount = (html: string) => {
    document.body.innerHTML = html;
    return document.body.firstElementChild as HTMLElement;
  };

  it('페이지 맨 위가 아니면 시작하지 않는다', () => {
    const el = mount('<p>글</p>');
    expect(canStartPull(el, 1)).toBe(false);
    expect(canStartPull(el, 0)).toBe(true);
  });

  it('입력칸·편집기 안에서는 시작하지 않는다', () => {
    expect(canStartPull(mount('<textarea></textarea>'), 0)).toBe(false);
    expect(canStartPull(mount('<input />'), 0)).toBe(false);
    const editor = mount('<div contenteditable="true"><p>본문</p></div>');
    expect(canStartPull(editor.firstElementChild, 0)).toBe(false);
  });

  it('data-pull-refresh="off" 안쪽(지도)에서는 시작하지 않는다', () => {
    const map = mount('<div data-pull-refresh="off"><canvas></canvas></div>');
    expect(canStartPull(map.firstElementChild, 0)).toBe(false);
  });

  it('스스로 스크롤되는 상자 안에서는 시작하지 않는다', () => {
    const box = mount(
      '<div style="overflow-y:auto;height:50px"><div style="height:500px"></div></div>'
    );
    /* jsdom 은 레이아웃을 하지 않아 scrollHeight 가 0 입니다. 값을 직접 넣어 줍니다. */
    Object.defineProperty(box, 'scrollHeight', { value: 500 });
    Object.defineProperty(box, 'clientHeight', { value: 50 });
    expect(canStartPull(box.firstElementChild, 0)).toBe(false);
  });

  it('보통 본문에서는 시작한다', () => {
    const el = mount('<section><p>글</p></section>');
    expect(canStartPull(el.firstElementChild, 0)).toBe(true);
  });
});
