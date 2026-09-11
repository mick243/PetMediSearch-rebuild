import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { MdInbox } from 'react-icons/md';
import { getCommentsByUserId } from '../../apis/myprofile.api';
import { MyComment } from '../../types/post.type';
import { formatDate } from '../../utils/format';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * 마이페이지의 "내가 쓴 댓글" 칸.
 *
 * 댓글은 글과 달리 그 자체로는 무슨 얘기였는지 알 수 없어서, 단 글의 제목을
 * 위에 두고 내용을 아래에 둡니다. 누르면 그 글로 갑니다.
 */
function MyComments() {
  const navigate = useNavigate();
  const [comments, setComments] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(true);
  /*
   * 못 불러온 것과 쓴 적이 없는 것은 다른 상태입니다.
   * 실패를 빈 목록으로 그리면 "댓글이 없습니다" 가 떠서, 쓴 댓글이 사라진 줄 압니다.
   */
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getCommentsByUserId()
      .then((rows) => alive && setComments(rows ?? []))
      .catch((error) => {
        console.error('댓글 데이터를 가져오는 중 오류 발생:', error);
        if (alive)
          setFailed(apiErrorMessage(error, '댓글을 불러오지 못했습니다.'));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <MyCommentsStyle>
      {loading && <p className="notice">불러오는 중…</p>}

      {!loading && failed && <p className="notice failed">{failed}</p>}

      {!loading && !failed && comments.length === 0 && (
        <div className="noResults">
          <MdInbox className="emptyIcon" />
          <p>작성한 댓글이 없습니다.</p>
        </div>
      )}

      {!loading && !failed && comments.length > 0 && (
        <ul className="comments">
          {comments.map((comment) => (
            <li key={comment.comment_id}>
              {/* 댓글 자리까지 짚어 주지는 않습니다. 댓글이 많은 글은 그 댓글이 몇 쪽에 있는지 알아야 합니다. */}
              <button
                type="button"
                onClick={() => navigate(`/posts/${comment.post_id}`)}
              >
                <span className="head">
                  <span className="post">{comment.post_title}</span>
                  <span className="date">{formatDate(comment.created_at)}</span>
                </span>
                <span className="content">{comment.content}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </MyCommentsStyle>
  );
}

const MyCommentsStyle = styled.div`
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
      color: ${({ theme }) => theme.color.borderStrong};
    }

    p {
      margin: 0;
      padding: 10px;
      font-size: 12px;
      color: ${({ theme }) => theme.color.textMuted};
    }
  }

  .comments {
    margin: 0;
    padding: 0;
    height: 198px;
    overflow-y: auto;
    list-style: none;
  }

  .comments button {
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
    background-color: ${({ theme }) => theme.color.surface};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .comments button:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.sm};
  }

  /* 어느 글에 단 댓글인지. 제목이 길어도 한 줄을 넘기지 않습니다. */
  .post {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.text};
  }

  .date {
    flex: none;
    font-size: 11px;
    color: ${({ theme }) => theme.color.textMuted};
    font-variant-numeric: tabular-nums;
  }

  /* 내용은 두 줄까지. 긴 댓글이 칸을 혼자 차지하면 목록 구실을 못 합니다. */
  .content {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-top: 2px;
    font-size: 12px;
    line-height: 1.4;
    color: ${({ theme }) => theme.color.textMuted};
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

export default MyComments;
