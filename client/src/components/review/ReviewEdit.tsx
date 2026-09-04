import { useState } from 'react';
import { ReviewData } from '../../types/review.type';
import Button from '../common/Button';
import styled from 'styled-components';
import Star from '../common/Star';

interface EditReviewFormProps {
  review: ReviewData;
  onEdit: (
    reviewId: number,
    updatedRating: number,
    updatedContent: string
  ) => void;
  onCancel: () => void;
}

function EditReviewForm({ review, onEdit, onCancel }: EditReviewFormProps) {
  const [updatedRating, setUpdatedRating] = useState<number>(review.rating);
  const [updatedContent, setUpdatedContent] = useState<string>(
    review.review_content
  );

  const handleEdit = () => {
    onEdit(review.review_id, updatedRating, updatedContent);
  };

  return (
    <EditReviewFormStyle>
      <div className="editInfo">
        <div className="rating">
          <Star
            setClickRating={setUpdatedRating}
            rating={updatedRating}
            interactive={true}
          />
        </div>
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
        value={updatedContent}
        onChange={(e) => setUpdatedContent(e.target.value)}
      />
    </EditReviewFormStyle>
  );
}

const EditReviewFormStyle = styled.div`
  .editInfo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 6px;
  }

  .rating {
    padding-bottom: 3px;
    border-bottom: 1px solid #f5f5f5;
  }

  .content {
    width: 300px;
    height: 60px;
    padding: 10px;
    margin-top: 10px;
    border: 1px solid #ddd;
    resize: none;
    font-size: 10px;
    color: #333;
    background-color: #f5f5f5;
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.3);
    transition: border-color 0.2s ease-in-out;

    &:focus {
      border-color: #c6cdbe;
      outline: none;
    }

    &::placeholder {
      color: #aaa;
    }
  }

  .bttn {
    display: flex;
    justify-content: end;
    gap: 5px;
  }
`;

export default EditReviewForm;
