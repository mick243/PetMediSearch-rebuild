import styled from 'styled-components';
import { PostState } from '../../types/post.type';
import { excerpt, firstImage, timeAgo } from '../../utils/postContent';
import PostThumb from './PostThumb';

interface Props {
  post: PostState;
  /** 지금 보고 있는 탭. 다른 분류의 글이면 어느 분류인지 칩으로 붙입니다. */
  selectedCategoryId?: number | null;
  onClick: (postId: number) => void;
}

/**
 * 목록 맨 위 대표 글.
 *
 * 조회수 컬럼이 없어 '인기 글'은 아직 못 고릅니다.
 * 목록이 작성일 내림차순이라 가장 최근 글을 세워둡니다.
 */
function BoardHero({ post, selectedCategoryId, onClick }: Props) {
  const image = firstImage(post.content);
  const preview = excerpt(post.content);

  return (
    <Hero type="button" onClick={() => onClick(post.post_id)}>
      {image && <PostThumb src={image} variant="hero" />}
      <Label>최신 글</Label>
      <Title>{post.title}</Title>
      {preview && <Preview>{preview}</Preview>}
      <Meta>
        {post.category_name && post.category_id !== selectedCategoryId && (
          <Chip>{post.category_name}</Chip>
        )}
        <span>{post.username ?? post.author}</span>
        <Dot aria-hidden="true" />
        <span>{timeAgo(post.created_at)}</span>
      </Meta>
    </Hero>
  );
}

const Hero = styled.button`
  display: grid;
  gap: ${({ theme }) => theme.space.sm};
  width: 100%;
  padding: ${({ theme }) => theme.space.lg};
  text-align: left;
  background-color: ${({ theme }) => theme.color.surface};
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;

const Label = styled.span`
  justify-self: start;
  padding: 1px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.text};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.text};
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Preview = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.textMuted};
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Meta = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin: 0;
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

export default BoardHero;
