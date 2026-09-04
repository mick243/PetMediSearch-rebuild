import { useEffect, useState } from 'react';
import styled from 'styled-components';
import DeleteModal from '../modal/DeleteModal';
import EditModal from '../modal/EditModal';

export default function CommentItem({ comment }) {
  const [editText, setEditText] = useState('');
  // const [isOpenProfileModal, setOpenProfileModal] = useState(false);
  const [editComments, setEditComments] = useState({
    id: comment.id,
    commentText: comment.commentText,
    postId: comment.postId,
    userId: comment.userId,
    nickName: comment.nickName,
    created_at: comment.createdAt,
    isEdit: comment.isEdit,
  });

  const uid = ''; //유저 인증

  const [viewDeleteModal, setDeleteViewModal] = useState(false);
  const [viewEditModal, setEditViewModal] = useState(false);
  const openDeleteModalClick = () => {
    setDeleteViewModal(true);
  };
  const openEditModalClick = () => {
    setEditViewModal(true);
  };

  const onClickIsEditSwitch = () => {
    setEditComments({ ...editComments, isEdit: true });
  };

  const editTextOnChange = (e) => {
    setEditText(e.target.value);
  };

  const cancleEditButton = (comment_id) => {
    console.log(comment_id);
    setEditComments({ ...editComments, isEdit: false });
  };

  const getComment = async () => {};

  useEffect(() => {
    getComment();
  }, []);

  return (
    <>
      {viewDeleteModal ? (
        <DeleteModal
          setDeleteViewModal={setDeleteViewModal}
          comment={comment}
        />
      ) : null}
      {viewEditModal ? (
        <EditModal
          setEditViewModal={setEditViewModal}
          comment={comment}
          editText={editText}
          setEditComments={setEditComments}
          editComments={editComments}
          setEditText={setEditText}
        />
      ) : null}
      <CommentContentContainer>
        {/* 댓글쓴이+날짜 */}
        <CommentTopContainer>
          <ProfileContainer>
            {/* {isOpenProfileModal ? (
              <UserProfileModal
                setOpenProfileModal={setOpenProfileModal}
                isOpenProfileModal={isOpenProfileModal}
              />
            ) : null} */}
            <ProfileNickName>{comment.nickName}</ProfileNickName>
            <ButtonContainer>
              {editComments.isEdit ? (
                <>
                  <CommentButton onClick={openEditModalClick}>
                    등록
                  </CommentButton>
                  <CommentButton
                    onClick={() => {
                      cancleEditButton(comment.id);
                    }}
                  >
                    취소
                  </CommentButton>
                </>
              ) : uid === comment.userId ? (
                // 로그인한 uid와 댓글의 uid가 같아야지만 수정,삭제버튼 보이게
                <>
                  <CommentButton
                    onClick={() => {
                      onClickIsEditSwitch(comment.id);
                    }}
                  >
                    수정
                  </CommentButton>
                  <CommentButton onClick={openDeleteModalClick}>
                    삭제
                  </CommentButton>
                </>
              ) : null}
            </ButtonContainer>
          </ProfileContainer>
          <Date>{comment.createdAt}</Date>
        </CommentTopContainer>
        {/* 수정버튼 누르면 인풋 생기게 */}
        {editComments.isEdit ? (
          <CommentEditInput
            defaultValue={comment.commentText}
            onChange={editTextOnChange}
          />
        ) : (
          <ContentText>{comment.commentText}</ContentText>
        )}
      </CommentContentContainer>
    </>
  );
}

const CommentContentContainer = styled.div``;

const CommentTopContainer = styled.div``;

const ProfileContainer = styled.div``;

const ProfileNickName = styled.p``;

const Date = styled.div``;

const ContentText = styled.p``;

const CommentEditInput = styled.textarea``;

const ButtonContainer = styled.div``;

const CommentButton = styled.span``;
