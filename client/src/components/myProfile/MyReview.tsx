import { useEffect, useState } from 'react';
import { ReviewData } from '../../types/review.type';
import { getReviewsByUserId } from '../../apis/myprofile.api';
import Programming from '../../assets/images/Programming.png';
import { ReviewBoxStyle } from '../review/ReviewBox';
import React from 'react';
import Star from '../common/Star';
import styled from 'styled-components';
import { formatDate } from '../../utils/format';

function MyReview() {
  const [myReviews, setMyReviews] = useState<ReviewData[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);

  const handleClickReview = (reviewId: number) => {
    setSelectedReviewId((prevId) => (prevId === reviewId ? null : reviewId));
  };

  useEffect(() => {
    getReviewsByUserId()
      .then((reviews) => {
        setMyReviews(reviews);
      })
      .catch((error) => {
        console.error('리뷰 데이터를 가져오는 중 오류 발생:', error);
      });
  }, []);

  return (
    <ReviewBoxStyle>
      <MyReviewStyle>
        {myReviews.length === 0 ? (
          <div className="noResults">
            <img src={Programming} />
            <p>등록된 리뷰가 없습니다.</p>
          </div>
        ) : (
          <ul className="reviews">
            {myReviews.map((review, index) => (
              <React.Fragment key={index}>
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

    img {
      width: 100px;
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
