/**
 * 마지막으로 검색해서 옮겨 간 지도 화면(중심 · 확대 단계)을 기억합니다.
 *
 * 위치 권한이 없으면 지도가 늘 서울시청에서 열려, 다른 지역 사람은 들어올 때마다 자기
 * 동네를 다시 검색해야 했습니다. 처음 열 때 위치를 못 얻으면 이 값으로 엽니다
 * (components/search/SearchMap.tsx).
 *
 * 앱을 닫았다 열어도 남아야 해서 sessionStorage 가 아니라 localStorage 에 둡니다.
 * 계정과 상관없는 기기 값이라 로그아웃해도 지우지 않습니다 — 개인정보처리방침 6장에
 * 그렇게 적어 두었습니다(pages/Privacy.tsx).
 */

const KEY = 'petmedi:lastSearchView';

export interface MapView {
  lat: number;
  lng: number;
  /** 카카오 지도의 확대 단계. 1 이 가장 가깝고 14 가 가장 넓습니다. */
  level: number;
}

function isMapView(value: unknown): value is MapView {
  const v = value as Partial<MapView> | null;
  if (!v) return false;
  const { lat, lng, level } = v;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  /*
   * (0,0) 은 좌표가 비어 있던 값이 숫자로 바뀐 것입니다. 지도를 그리로 옮기면 카카오가
   * 투영 범위 밖으로 밀어내 타일이 아예 안 그려집니다(SearchMap.tsx 의 주소 좌표 처리).
   */
  if (lat === 0 && lng === 0) return false;
  return (
    typeof level === 'number' &&
    Number.isInteger(level) &&
    level >= 1 &&
    level <= 14
  );
}

export function saveLastSearchView(view: MapView): void {
  if (!isMapView(view)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(view));
  } catch {
    // 시크릿 모드나 저장 공간 부족이면 그냥 기억을 못 할 뿐입니다.
  }
}

export function readLastSearchView(): MapView | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isMapView(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
