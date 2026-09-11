import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { PostState } from '../../types/post.type';
import { MdInbox } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { getPostsByUserId } from '../../apis/myprofile.api';
import { formatDate } from '../../utils/format';
import { apiErrorMessage } from '../../utils/apiError';

function MyPosts() {
  const [myPosts, setMyPosts] = useState<PostState[]>([]);
  const [loading, setLoading] = useState(true);
  /*
   * 못 불러온 것과 쓴 적이 없는 것은 다른 상태입니다.
   * 실패를 빈 목록으로 그리면 "글이 없습니다" 가 떠서, 쓴 글이 사라진 줄 압니다.
   */
  const [failed, setFailed] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleClickPost = (post_id: number) => {
    navigate(`/posts/${post_id}`);
  };

  useEffect(() => {
    let alive = true;
    getPostsByUserId()
      .then((posts) => alive && setMyPosts(posts ?? []))
      .catch((error) => {
        console.error('게시글 데이터를 가져오는 중 오류 발생:', error);
        if (alive)
          setFailed(apiErrorMessage(error, '글을 불러오지 못했습니다.'));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <MyPostsStyle>
      {loading && <p className="notice">불러오는 중…</p>}

      {!loading && failed && <p className="notice failed">{failed}</p>}

      {!loading && !failed && myPosts.length === 0 && (
        <div className="noResults">
          <MdInbox className="emptyIcon" />
          <p>작성한 게시글이 없습니다.</p>
        </div>
      )}

      {!loading && !failed && myPosts.length > 0 && (
        <ul className="posts">
          {myPosts.map((post) => (
            <li
              key={post.post_id}
              className="post"
              onClick={() => handleClickPost(post.post_id)}
            >
              <p>제목: {post.title}</p>
              <p>작성일: {formatDate(post.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </MyPostsStyle>
  );
}

const MyPostsStyle = styled.div`
  .notice {
    margin: 0;
    padding: ${({ theme }) => theme.space.lg};
    font-size: 13px;
    color: ${({ theme }) => theme.color.textMuted};
    text-align: center;
  }

  .notice.failed {
    color: ${({ theme }) => theme.color.danger};
  }

  .noResults {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 20px;

    .emptyIcon {
      width: 96px;
      height: 96px;
      color: #9e9e9e;
    }
    p {
      border-top: solid black;
      border-bottom: solid black;
      padding: 10px;
      font-size: 10px;
    }
  }

  .posts {
    padding: 0;
    height: 160px;
    overflow-y: auto;
  }

  .post {
    background-color: #f5f5f5;
    border-bottom: 1px solid #575757;
    padding: 1px;
    font-size: 16px;
    text-align: center;
    cursor: pointer;
    display: flex;
    justify-content: center;
    transition: 0.5s background-color;

    &:hover {
      background-color: #c3c3c3;
    }

    p {
      padding: 0px 5px;
      border-left: 1px solid #575757;
    }
  }
`;

export default MyPosts;
