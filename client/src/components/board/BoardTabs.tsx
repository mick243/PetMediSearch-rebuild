import styled from 'styled-components';
import SlideTabs from '../common/SlideTabs';
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
 * 9개가 한 줄에 안 들어가므로 SlideTabs 에 얹습니다 — 넘기는 화살표와
 * 고른 탭 끌어오기는 거기에 있습니다.
 */
function BoardTabs({ categories, selectedId, onSelect }: Props) {
  return (
    <TabList label="게시판 카테고리" activeKey={selectedId}>
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

/* 여백과 구분선은 화살표도 덮어야 해서 안쪽 줄이 아니라 바깥에 겁니다. */
const TabList = styled(SlideTabs)`
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
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
