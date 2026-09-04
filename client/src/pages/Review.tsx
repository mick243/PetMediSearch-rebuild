import styled from 'styled-components';
import SearchBox from '../components/search/SearchBox';
import ReviewInput from '../components/review/ReviewInput';
import ReviewBox from '../components/review/ReviewBox';
import ReviewPlaceList from '../components/review/ReviewPlaceList';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { PlaceData } from '../types/place.type';
import { useEffect, useState } from 'react';
import { ReviewData } from '../types/review.type';
import { getReviewsByFacilityId } from '../apis/review.api';

function Review() {
  const selectedPlace = useSelector(
    (state: RootState) => state.place.selectedPlace as PlaceData
  );
  const [reviews, setReviews] = useState<ReviewData[]>([]);

  useEffect(() => {
    if (selectedPlace) {
      getReviewsByFacilityId(selectedPlace.id)
        .then((reviews) => setReviews(reviews || []))
        .catch((err) =>
          console.error('리뷰 목록을 불러오는 중 오류 발생:', err)
        );
    }
  }, [selectedPlace]);

  return (
    <ReviewStyle>
      <SearchBox />
      <div className="review">
        {selectedPlace && selectedPlace.id ? (
          <>
            <ReviewInput setReviews={setReviews} />
            <ReviewBox reviews={reviews} setReviews={setReviews} />
          </>
        ) : (
          <ReviewPlaceList />
        )}
      </div>
    </ReviewStyle>
  );
}

const ReviewStyle = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0px 30px;
  align-items: center;
  justify-content: end;
  gap: 20px;
`;

export default Review;
