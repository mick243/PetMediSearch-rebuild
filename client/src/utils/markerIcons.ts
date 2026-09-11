/**
 * 지도 마커 아이콘.
 *
 * 기존에는 출처가 불분명한 MarkerSprites.png 스프라이트 시트를 썼습니다.
 * 외부 이미지 없이 쓰도록 SVG 를 data URI 로 만들어 대체했습니다.
 * 색은 앱에서 쓰던 팔레트(#e44c4c / #5ba95b / #575757)를 그대로 씁니다.
 */

const PIN_WIDTH = 36;
const PIN_HEIGHT = 44;

/** 물방울 핀 + 안쪽 심볼을 data URI 로 만듭니다. */
function pin(fill: string, symbol: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 36 44">` +
    '<path d="M18 1.5C9.99 1.5 3.5 7.99 3.5 16c0 10.2 12.02 23.5 13.66 25.28a1.15 1.15 0 0 0 1.68 0C20.48 39.5 32.5 26.2 32.5 16 32.5 7.99 26.01 1.5 18 1.5z" ' +
    `fill="${fill}" stroke="#ffffff" stroke-width="2.4"/>` +
    symbol +
    '</svg>';

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const CROSS =
  '<path d="M15.6 9.6h4.8v4.8h4.8v4.8h-4.8v4.8h-4.8v-4.8h-4.8v-4.8h4.8z" fill="#ffffff"/>';
const RING =
  '<circle cx="18" cy="16.8" r="5.4" fill="none" stroke="#ffffff" stroke-width="3"/>';
const DOT = '<circle cx="18" cy="16.8" r="4.8" fill="#ffffff"/>';

/** 병원 — 붉은 핀 + 흰 십자 */
export const HOSPITAL_MARKER = pin('#e44c4c', CROSS);

/** 약국 — 초록 핀 + 흰 링 */
export const PHARMACY_MARKER = pin('#5ba95b', RING);

/** 전체 / 현재 위치 — 회색 핀 + 흰 점 */
export const CURRENT_MARKER = pin('#575757', DOT);

/** 카카오맵 MarkerImage 에 넘기는 크기 */
export const MARKER_SIZE = { width: PIN_WIDTH, height: PIN_HEIGHT };

/** CSS background-image 로 쓸 때 */
export const markerUrl = (dataUri: string) => `url("${dataUri}")`;
