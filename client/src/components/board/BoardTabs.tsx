import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Category } from '../../types/post.type';

interface Props {
  categories: Category[];
  selectedId: number | null;
  onSelect: (categoryId: number) => void;
}

/**
 * 게시판 상단 카테고리 탭.
 *
 * 예전에는 카테고리 화면에서 하나 고르면 목록 화면으로 넘어가서,
 * 다른 분류를 보려면 뒤로가기를 거쳐야 했습니다. 탭으로 두면 그 자리에서 바뀝니다.
 * 9개가 한 줄에 안 들어가므로 가로 스크롤이고, 고른 탭은 항상 보이게 끌어옵니다.
 */
function BoardTabs({ categories, selectedId, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = listRef.current?.querySelector('[aria-selected="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [selectedId]);

  return (
    <TabList ref={listRef} role="tablist" aria-label="게시판 카테고리">
      {categories.map((item) => (
        <Tab
          key={item.category_id}
          type="button"
          role="tab"
          aria-selected={item.category_id === selectedId}
          $on={item.category_id === selectedId}
          onClick={() => item.category_id != null && onSelect(item.category_id)}
        >
          {item.category_name}
        </Tab>
      ))}
    </TabList>
  );
}

const TabList = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button<{ $on: boolean }>`
  flex: none;
  padding: 5px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid
    ${({ theme, $on }) =>
      $on ? theme.color.primary : theme.color.borderStrong};
  background-color: ${({ theme, $on }) =>
    $on ? theme.color.primary : theme.color.surface};
  color: ${({ theme, $on }) =>
    $on ? theme.color.textInverse : theme.color.textMuted};
  font-size: 13px;
  font-weight: ${({ $on }) => ($on ? 600 : 400)};
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.color.primary};
  }
`;

export default BoardTabs;
