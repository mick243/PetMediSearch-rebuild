import styled from 'styled-components';
import Star from '../common/Star';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import Button from '../common/Button';
import { addReview, getReviewsByFacilityId } from '../../apis/review.api';
import { useState } from 'react';
import { PlaceData } from '../../types/place.type';

function ReviewInput({ setReviews }) {
  const selectedPlace = useSelector(
    (state: RootState) => state.place.selectedPlace as PlaceData
  );
  const user = useSelector((state: RootState) => state.auth.user);
  const [rating, setRating] = useState<number>(5);
  const [reviewContent, setReviewContent] = useState<string>('');

  const handleSubmit = async () => {
    try {
      await addReview(user.id, selectedPlace.id, rating, reviewContent);
      setRating(5);
      setReviewContent('');

      const updatedReviews = await getReviewsByFacilityId(selectedPlace.id);
      setReviews(updatedReviews || []);
    } catch (err) {
      console.error(`리뷰를 등록하던 중 오류 발생: ${err}`);
    }
  };

  return (
    <ReviewInputStyle>
      <div className="head">
        <div className="info">
          <div className="title">
            <div>{selectedPlace?.bplcnm}</div>
            <Star
              setClickRating={setRating}
              rating={rating}
              interactive={true}
            />
          </div>
          <div className="address">{selectedPlace?.rdnwhladdr}</div>
        </div>
        <Button size="small" scheme="positive" onClick={handleSubmit}>
          등록
        </Button>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          id="reviewContent"
          placeholder="후기를 작성해주세요"
          value={reviewContent}
          onChange={(e) => setReviewContent(e.target.value)}
        />
      </form>
    </ReviewInputStyle>
  );
}

const ReviewInputStyle = styled.div`
  background-color: #d9d9d9;
  padding: 8px;

  .head {
    display: flex;
    justify-content: space-between;
    .info {
      display: flex;
      flex-direction: column;
      padding: 0px 5px;
      .title {
        display: flex;
        gap: 10px;
        font-weight: bold;
        font-size: 20px;
      }
    }
  }

  .address {
    font-size: 10px;
  }

  form {
    padding: 6px 0px 0px;
    textarea {
      width: 300px;
      height: 20px;
      padding: 10px;
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
  }
`;

export default ReviewInput;
