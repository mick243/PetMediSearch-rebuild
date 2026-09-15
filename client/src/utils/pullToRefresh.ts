/**
 * 당겨서 새로고침의 판단 규칙.
 *
 * 터치 리스너는 components/common/PullToRefresh.tsx 에 있고, 여기에는 DOM 이벤트와
 * 떼어 낼 수 있는 계산만 둡니다. 어디서 당기면 안 되는지가 제일 자주 틀리는 부분이라
 * 시험으로 고정해 둡니다.
 */

/** 이만큼 당겨야 새로고침합니다. 손가락 이동으로는 두 배(약 144px)입니다. */
export const PULL_THRESHOLD = 72;
/** 표시기가 내려오는 최대 거리. */
export const PULL_MAX = 110;

/**
 * 손가락 이동 거리(px)를 표시기가 내려오는 거리로 바꿉니다.
 *
 * 절반만 따라오게 해서 고무줄처럼 느껴지게 합니다. 1:1 로 따라오면 손가락이
 * 화면 반을 내려오기도 전에 새로고침돼 실수로 걸리기 쉽습니다.
 */
export function pullDistance(dy: number): number {
  if (dy <= 0) return 0;
  return Math.min(PULL_MAX, dy * 0.5);
}

export function shouldRefresh(distance: number): boolean {
  return distance >= PULL_THRESHOLD;
}

/** 이 안에서 시작한 터치는 당김으로 보지 않습니다. 지도처럼 스스로 드래그를 쓰는 영역에 붙입니다. */
export const PULL_OFF_ATTR = 'data-pull-refresh';

const NO_PULL_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  `[${PULL_OFF_ATTR}="off"]`,
].join(', ');

/**
 * 이 터치로 당김을 시작해도 되는지.
 *
 * - 페이지가 맨 위가 아니면 안 됩니다. 스크롤 중간에서 위로 올리는 동작과 겹칩니다.
 * - 입력 중인 칸(입력·글 편집기)이나 지도 안에서는 안 됩니다. 글을 쓰다가 새로고침되면
 *   쓰던 내용이 사라집니다.
 * - 안쪽에 따로 스크롤되는 상자가 있으면 안 됩니다. 그 상자를 위로 올리려는 손짓이
 *   페이지 새로고침으로 읽힙니다.
 */
export function canStartPull(
  target: EventTarget | null,
  scrollY: number
): boolean {
  if (scrollY > 0) return false;
  if (!(target instanceof Element)) return true;

  let el: Element | null = target;
  while (el && el !== document.body) {
    if (el.matches(NO_PULL_SELECTOR)) return false;

    const { overflowY } = getComputedStyle(el);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight
    ) {
      return false;
    }
    el = el.parentElement;
  }
  return true;
}
