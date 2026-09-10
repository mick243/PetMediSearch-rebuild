import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { PostState } from '../types/post.type';
import { firstImage, timeAgo } from '../utils/postContent';
import PostThumb from './board/PostThumb';

interface Props {
  post: PostState[];
  /** 지금 보고 있는 탭. 다른 분류의 글이면 어느 분류인지 칩으로 붙입니다. */
  selectedCategoryId?: number | null;
}

/**
 * 게시판 목록.
 *
 * 본문에 이미지가 있으면 왼쪽에 정사각 썸네일을 두고, 없으면 그 칸 자체를 없앱니다.
 * (빈 회색 네모가 남으면 이미지가 깨진 것처럼 보입니다.)
 */
const PostList = ({ post, selectedCategoryId }: Props) => {
  const navigate = useNavigate();

  return (
    <List>
      {post.map((item) => {
        const image = firstImage(item.content);

        return (
          <li key={item.post_id}>
            <Row
              type="button"
              $withThumb={Boolean(image)}
              onClick={() => navigate(`/posts/${item.post_id}`)}
            >
              {image && <PostThumb src={image} variant="list" />}
              <div>
                <Title>{item.title}</Title>
                <Meta>
                  {item.category_name &&
                    item.category_id !== selectedCategoryId && (
                      <Chip>{item.category_name}</Chip>
                    )}
                  <span>{item.username ?? item.author}</span>
                  <Dot aria-hidden="true" />
                  <span>{timeAgo(item.created_at)}</span>
                </Meta>
              </div>
            </Row>
          </li>
        );
      })}
    </List>
  );
};

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Row = styled.button<{ $withThumb: boolean }>`
  display: grid;
  grid-template-columns: ${({ $withThumb }) =>
    $withThumb ? '56px minmax(0, 1fr)' : 'minmax(0, 1fr)'};
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  text-align: left;
  background-color: ${({ theme }) => theme.color.surface};
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;

const Title = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.text};
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Meta = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin: 4px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const Chip = styled.span`
  padding: 0 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme }) => theme.color.surfaceMuted};
  color: ${({ theme }) => theme.color.text};
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
`;

const Dot = styled.i`
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.borderStrong};
`;

export default PostList;
