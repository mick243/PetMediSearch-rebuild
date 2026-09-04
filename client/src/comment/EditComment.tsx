import { useState } from 'react';
import styled from 'styled-components';
import { Comment } from '../types/post.type';
import Button from '../components/common/Button';

interface EditCommentProps {
  comment: Comment;
  onEdit: (comment_id: number, updateContent: string) => void;
  onCancel: () => void;
}

function EditComments({ comment, onEdit, onCancel }: EditCommentProps) {
  const [updateContent, setUpdateContent] = useState<string>(comment.content);

  const handleEdit = () => {
    onEdit(comment.comment_id, updateContent);
  };

  return (
    <EditCommentStyle>
      <div className="editInfo">
        <div className="bttn">
          <Button size="small" scheme="positive" onClick={handleEdit}>
            수정
          </Button>
          <Button size="small" scheme="negative" onClick={onCancel}>
            취소
          </Button>
        </div>
      </div>
      <textarea
        className="content"
        value={updateContent}
        onChange={(e) => setUpdateContent(e.target.value)}
      />
    </EditCommentStyle>
  );
}

const EditCommentStyle = styled.div`
  .bttn {
    display: flex;
    justify-content: end;
    gap: 5px;
  }
`;

export default EditComments;
