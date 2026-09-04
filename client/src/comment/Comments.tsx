import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useState } from 'react';
import React from 'react';
import { RootState } from '../store';
import { Comment } from '../types/post.type';
import { editComment, deleteComment } from '../apis/Comment.api';
import EditComments from './EditComment';
import PaginationComp from '../components/common/PaginationComp';
import Button from '../components/common/Button';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear().toString().slice(2); // 연도의 마지막 두 자리
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 월을 2자리로
  const day = date.getDate().toString().padStart(2, '0'); // 일을 2자리로
  return `${year}-${month}-${day}`;
};

function Comments() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [comments, setComments] = useState<Comment[]>([]);
  const [editCommentId, setEditCommentId] = useState<number | null>(null); // 수정 중인 리뷰 ID
  const [currentPage, setCurrentPage] = useState(1);

  const postsPerPage = 5;
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentComment = comments.slice(indexOfFirstPost, indexOfLastPost);

  const Editing = (comment: Comment) => {
    setEditCommentId(comment.comment_id);
  };

  const handleEditComment = async (
    commentId: number,
    updateContent: string
  ) => {
    try {
      const updatedContent = await editComment(commentId, updateContent);

      alert('댓글이 수정되었습니다');
      setComments((changeComment) =>
        changeComment.map((prev) =>
          prev.comment_id === commentId ? updatedContent : prev
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveComment = async (comment: Comment) => {
    try {
      await deleteComment(comment.comment_id);
      alert('리뷰가 삭제되었습니다.');
      setComments((prevComment) =>
        prevComment.filter((prev) => prev.comment_id !== comment.comment_id)
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(
    null
  );

  const handleClickComment = (commentId: number) => {
    setSelectedCommentId((prevId) => (prevId === commentId ? null : commentId));
  };

  return (
    <ReviewBoxStyle>
      <div>
        {comments.length === 0 ? (
          <div className="noResults">
            <p>등록된 리뷰가 없습니다.</p>
          </div>
        ) : (
          <>
            <ul className="reviews">
              {currentComment.map((comment, index) => (
                <React.Fragment key={index}>
                  <li
                    className="review"
                    onClick={() => handleClickComment(comment.comment_id)}
                  >
                    <p>작성자 번호: {comment.user_id}</p>
                    <p>작성 일자: {formatDate(comment.created_at)}</p>
                    <p>{comment.content}</p>
                  </li>
                  {selectedCommentId === comment.comment_id && (
                    <li className="reviewDetail">
                      {editCommentId === comment.comment_id ? (
                        <EditComments
                          comment={comment}
                          onEdit={handleEditComment}
                          onCancel={() => setEditCommentId(null)}
                        />
                      ) : (
                        <>
                          <div className="detailInfo">
                            <p className="createdAt">
                              작성 일시: {comment.created_at}
                            </p>
                            {comment.user_id === user.id ? (
                              <div className="bttn">
                                <Button
                                  size="small"
                                  scheme="positive"
                                  onClick={() => Editing(comment)}
                                >
                                  수정
                                </Button>
                                <Button
                                  size="small"
                                  scheme="negative"
                                  onClick={() => handleRemoveComment(comment)}
                                >
                                  삭제
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <div className="content">{comment.content}</div>
                        </>
                      )}
                    </li>
                  )}
                </React.Fragment>
              ))}
            </ul>
            <PaginationComp
              totalItemsCount={comments.length}
              itemsCountPerPage={postsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </ReviewBoxStyle>
  );
}

const ReviewBoxStyle = styled.div`
  .bttn {
    display: flex;
    justify-content: end;
    gap: 5px;
  }
`;

export default Comments;
