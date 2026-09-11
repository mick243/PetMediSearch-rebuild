import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import dompurify from 'dompurify';
import { PostState } from '../types/post.type';
import { RootState } from '../store';
import CommentSection from '../comment/CommentSection';
import { deletePosts, editPosts } from '../apis/Posts.api';
import EditPost from './EditPost';
import { formatDateTime } from '../utils/postContent';
import { apiErrorMessage } from '../utils/apiError';

const BASE_URL = import.meta.env.VITE_BASE_URL;

function PostDetail() {
  const [post, setPost] = useState<PostState>();
  const [isEditing, setIsEditing] = useState(false);
  const postId = useParams().id;
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const sanitizer = dompurify.sanitize;

  /*
   * 수정은 작성자에게만, 삭제는 작성자와 관리자에게 보입니다.
   * 서버도 토큰으로 한 번 더 막지만, 남의 글에서 버튼이 보이는 것 자체가 혼란스럽습니다.
   */
  const isAuthor = !!post && !!user?.id && post.user_id === user.id;
  /** 관리자가 남의 글을 지우는 경우. 실수로 누르지 않도록 표시와 확인 문구를 다르게 합니다. */
  const deletingAsAdmin = !!post && user?.role === 'admin' && !isAuthor;
  const canDelete = isAuthor || deletingAsAdmin;

  const handleDeletePosts = async () => {
    const message = deletingAsAdmin
      ? `관리자 권한으로 ${post?.author}님의 게시글을 삭제합니다. 계속할까요?`
      : '게시글을 삭제하시겠습니까?';
    if (!window.confirm(message)) return;
    try {
      await deletePosts(Number(postId));
      alert('게시글이 삭제되었습니다.');
      navigate('/posts');
    } catch (error: any) {
      console.error(error);
      alert(apiErrorMessage(error, '게시글을 삭제하지 못했습니다.'));
    }
  };

  /*
   * 수정은 같은 화면에서 에디터로 바꿔 보여줍니다.
   * 저장은 서버가 토큰의 사용자와 글 작성자를 비교해 작성자만 통과시킵니다.
   */
  const handleEditSubmit = async (
    post_id: number,
    updateTitle: string,
    updateContent: string
  ) => {
    try {
      await editPosts(post_id, updateTitle, updateContent);
      setPost((prev) =>
        prev ? { ...prev, title: updateTitle, content: updateContent } : prev
      );
      setIsEditing(false);
      alert('게시글이 수정되었습니다.');
    } catch (error: any) {
      alert(apiErrorMessage(error, '게시글을 수정하지 못했습니다.'));
    }
  };

  useEffect(() => {
    const fetchPostById = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/posts/${postId}`);
        setPost(response.data);
      } catch (error) {
        console.error('Error fetching post:', error);
      }
    };
    fetchPostById();
  }, [postId]);

  if (post && isEditing) {
    return (
      <EditPost
        post={{ ...post, post_id: Number(postId) }}
        onEdit={handleEditSubmit}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <Page>
      {post ? (
        <>
          <Head>
            <Title>{post.title}</Title>
            <MetaRow>
              <Meta>
                <span>{post.author}</span>
                <Dot aria-hidden="true" />
                <span>{formatDateTime(post.created_at)}</span>
              </Meta>
              {canDelete && (
                <ActionGroup>
                  {/* 관리자라도 남의 글을 고칠 수는 없습니다. 수정은 작성자만. */}
                  {isAuthor && (
                    <SmallBt type="button" onClick={() => setIsEditing(true)}>
                      수정
                    </SmallBt>
                  )}
                  <SmallBt
                    type="button"
                    $danger
                    onClick={() => {
                      handleDeletePosts();
                    }}
                  >
                    {deletingAsAdmin ? '삭제 (관리자)' : '삭제'}
                  </SmallBt>
                </ActionGroup>
              )}
            </MetaRow>
          </Head>

          <Content
            className="content"
            dangerouslySetInnerHTML={{ __html: sanitizer(`${post.content}`) }}
          />
        </>
      ) : (
        <Empty>게시글이 존재하지 않습니다.</Empty>
      )}

      <CommentSection postId={Number(postId)} postAuthorId={post?.user_id} />
    </Page>
  );
}

export default PostDetail;

/*
 * 제목·작성자·작성일·본문·댓글이 모두 같은 글꼴(본문용 Pretendard)·크기를 씁니다.
 * h1 은 App.css 전역 규칙으로 손글씨체(Garam)를 받으므로 여기서 되돌립니다.
 */
const TEXT_SIZE = '15px';

const Page = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  background-color: ${({ theme }) => theme.color.surface};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${TEXT_SIZE};
  color: ${({ theme }) => theme.color.text};
`;

const Head = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.lg};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const Title = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${TEXT_SIZE};
  font-weight: 700;
  line-height: 1.5;
  word-break: keep-all;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
`;

const Meta = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin: 0;
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${TEXT_SIZE};
  color: ${({ theme }) => theme.color.textMuted};
  font-variant-numeric: tabular-nums;
`;

const Dot = styled.i`
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.borderStrong};
`;

/* 수정·삭제. 오른쫽 정렬, 사이 5px. */
const ActionGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  flex: none;
`;

/* 기존 Button size="small" 과 같은 치수(12px / 8px 12px)를 유지합니다. */
const SmallBt = styled.button<{ $danger?: boolean; $primary?: boolean }>`
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  font-family: ${({ theme }) => theme.font.body};
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? theme.color.primary : theme.color.borderStrong};
  background-color: ${({ theme, $primary }) =>
    $primary ? theme.color.primary : theme.color.surface};
  color: ${({ theme, $danger, $primary }) =>
    $primary
      ? theme.color.textInverse
      : $danger
        ? theme.color.danger
        : theme.color.text};
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;

  &:hover {
    background-color: ${({ theme, $primary }) =>
      $primary ? theme.color.primaryHover : theme.color.surfaceMuted};
  }
`;

const Content = styled.div`
  flex: 1;
  padding: ${({ theme }) => theme.space.lg};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${TEXT_SIZE};
  line-height: 1.7;
  word-break: keep-all;
  overflow-wrap: anywhere;

  p {
    margin: 0 0 ${({ theme }) => theme.space.sm};
  }

  img {
    max-width: 100%;
    border-radius: ${({ theme }) => theme.radius.sm};
  }
`;

const Empty = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.space.xxl} ${({ theme }) => theme.space.lg};
  text-align: center;
  color: ${({ theme }) => theme.color.textMuted};
`;
