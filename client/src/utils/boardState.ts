/**
 * 게시판에서 보고 있던 자리(분류·페이지·스크롤)를 기억합니다.
 *
 * 글을 열었다 돌아오면 목록이 늘 통합 1페이지 맨 위로 튀었습니다.
 * 서버에 둘 값은 아니라서 세션 저장소에 남겨두고 돌아올 때 되살립니다.
 * (탭을 닫으면 사라지므로 오래 남지 않습니다.)
 */

const KEY = 'petmedi:board';

export interface BoardState {
  categoryId: number;
  page: number;
  scrollY: number;
}

function isBoardState(value: unknown): value is BoardState {
  const v = value as Partial<BoardState> | null;
  return (
    !!v &&
    typeof v.categoryId === 'number' &&
    typeof v.page === 'number' &&
    typeof v.scrollY === 'number'
  );
}

export function saveBoardState(state: BoardState): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 시크릿 모드나 저장 공간 부족이면 그냥 기억을 못 할 뿐입니다.
  }
}

export function readBoardState(): BoardState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isBoardState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
