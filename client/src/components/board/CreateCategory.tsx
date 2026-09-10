import BoardTabs from './BoardTabs';

/**
 * 글 작성 시 고르는 게시판 카테고리.
 * id 는 DB categories 테이블의 category_id 이고, 배열 순서가 화면 순서입니다.
 */
const CATEGORIES = [
  { id: 1, label: '통합' },
  { id: 2, label: '강아지' },
  { id: 3, label: '고양이' },
  { id: 4, label: '포유류' },
  { id: 5, label: '양서류' },
  { id: 6, label: '파충류' },
  { id: 7, label: '조류' },
  { id: 8, label: '어류' },
  { id: 9, label: '기타' },
];

interface Props {
  selectedId: number | null;
  onSelect: (categoryId: number) => void;
}

/**
 * 게시판 목록 상단 탭과 같은 모양의 가로 슬라이드.
 * 글은 한 분류에만 속하므로 하나만 고릅니다.
 */
export default function CreateCategory({ selectedId, onSelect }: Props) {
  return (
    <BoardTabs
      categories={CATEGORIES.map((c) => ({
        category_id: c.id,
        category_name: c.label,
      }))}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}
