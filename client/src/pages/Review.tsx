import styled from 'styled-components';
import SearchBox from '../components/search/SearchBox';
import ReviewInput from '../components/review/ReviewInput';
import ReviewBox from '../components/review/ReviewBox';
import ReviewSummary from '../components/review/ReviewSummary';
import ReviewPlaceList from '../components/review/ReviewPlaceList';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { PlaceData } from '../types/place.type';
import { useCallback, useEffect, useState } from 'react';
import {
  ReviewData,
  ReviewSummary as ReviewSummaryData,
} from '../types/review.type';
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
  /* AI 요약은 목록 응답에 같이 실려 옵니다. 5건 미만이면 null 이고 카드를 안 그립니다. */
  const [summary, setSummary] = useState<ReviewSummaryData | null>(null);

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
        setSummary(data.summary ?? null);
      } catch (err) {
        console.error('리뷰 목록을 불러오는 중 오류 발생:', err);
        setReviews([]);
        setTotal(0);
        setSummary(null);
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
            {summary && <ReviewSummary summary={summary} />}
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

/*
 * justify-content: end 였습니다. 세로로 꽉 차는 열이라, 내용을 바닥 쪽으로 밀어
 * 헤더 아래에 266px 짜리 빈 칸이 생겼습니다 — 검색창이 화면 한가운데 떠 있고
 * 그 위가 통째로 비어서 화면이 덜 그려진 것처럼 보였습니다. 위에서부터 채웁니다.
 */
const ReviewStyle = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px 30px 0;
  align-items: center;
  gap: 20px;
`;

export default Review;
