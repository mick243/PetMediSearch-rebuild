import styled from 'styled-components';
import SearchBox from '../components/search/SearchBox';
import ReviewInput from '../components/review/ReviewInput';
import ReviewBox from '../components/review/ReviewBox';
import ReviewPlaceList from '../components/review/ReviewPlaceList';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { PlaceData } from '../types/place.type';
import { useCallback, useEffect, useState } from 'react';
import { ReviewData } from '../types/review.type';
import { getReviewsByFacilityId, REVIEWS_PER_PAGE } from '../apis/review.api';

/*
 * 후기 목록과 쪽 번호를 이 화면이 들고 있습니다.
 * 예전에는 이 화면과 ReviewBox 가 각자 같은 목록을 불러와 요청이 두 번 나갔습니다.
 */
function Review() {
  const selectedPlace = useSelector(
    (state: RootState) => state.place.selectedPlace as PlaceData
  );
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (which: number) => {
      if (!selectedPlace) return;
      try {
        const data = await getReviewsByFacilityId(
          selectedPlace.id,
          which,
          REVIEWS_PER_PAGE
        );
        setReviews(data.reviews ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        console.error('리뷰 목록을 불러오는 중 오류 발생:', err);
        setReviews([]);
        setTotal(0);
      }
    },
    [selectedPlace]
  );

  /* 시설을 바꾸면 첫 쪽부터 봅니다. */
  useEffect(() => {
    setPage(1);
  }, [selectedPlace]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  return (
    <ReviewStyle>
      <SearchBox />
      <div className="review">
        {selectedPlace && selectedPlace.id ? (
          <>
            <ReviewInput
              onAdded={() => {
                setPage(1);
                load(1);
              }}
            />
            <ReviewBox
              reviews={reviews}
              total={total}
              page={page}
              onPageChange={setPage}
              onReload={() => load(page)}
            />
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
