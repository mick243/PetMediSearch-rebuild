import { useEffect, useState } from 'react';
import { ReviewData } from '../../types/review.type';
import { getReviewsByUserId } from '../../apis/myprofile.api';
import { MdInbox } from 'react-icons/md';
import { ReviewBoxStyle } from '../review/ReviewBox';
import React from 'react';
import Star from '../common/Star';
import styled from 'styled-components';
import { formatDate } from '../../utils/format';
import { apiErrorMessage } from '../../utils/apiError';

function MyReview() {
  const [myReviews, setMyReviews] = useState<ReviewData[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  /*
   * 못 불러온 것과 쓴 적이 없는 것은 다른 상태입니다.
   * 실패를 빈 목록으로 그리면 "후기가 없습니다" 가 떠서, 쓴 후기가 사라진 줄 압니다.
   */
  const [failed, setFailed] = useState<string | null>(null);

  const handleClickReview = (reviewId: number) => {
    setSelectedReviewId((prevId) => (prevId === reviewId ? null : reviewId));
  };

  useEffect(() => {
    let alive = true;
    getReviewsByUserId()
      .then((reviews) => alive && setMyReviews(reviews ?? []))
      .catch((error) => {
        console.error('리뷰 데이터를 가져오는 중 오류 발생:', error);
        if (alive)
          setFailed(apiErrorMessage(error, '후기를 불러오지 못했습니다.'));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ReviewBoxStyle>
      <MyReviewStyle>
        {loading && <p className="notice">불러오는 중…</p>}

        {!loading && failed && <p className="notice failed">{failed}</p>}

        {!loading && !failed && myReviews.length === 0 && (
          <div className="noResults">
            <MdInbox className="emptyIcon" />
            <p>작성한 후기가 없습니다.</p>
          </div>
        )}

        {!loading && !failed && myReviews.length > 0 && (
          <ul className="reviews">
            {myReviews.map((review) => (
              <React.Fragment key={review.review_id}>
                <li
                  className="review"
                  onClick={() => handleClickReview(review.review_id)}
                >
                  <Star rating={review.rating} interactive={false} />
                  <p>시설 번호: {review.facility_id}</p>
                  <p>작성일: {formatDate(review.created_at)}</p>
                </li>
                {selectedReviewId === review.review_id && (
                  <li className="reviewDetail">
                    <div className="detailInfo">
                      <p className="createdAt">
                        작성 일시: {review.created_at}
                      </p>
                    </div>
                    <div className="content">{review.review_content}</div>
                  </li>
                )}
              </React.Fragment>
            ))}
          </ul>
        )}
      </MyReviewStyle>
    </ReviewBoxStyle>
  );
}

const MyReviewStyle = styled.div`
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

  .reviews {
    height: 160px;
    overflow-y: auto;
  }

  .review {
    font-size: 16px;
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
`;

export default MyReview;
