import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../../store';
import { useState } from 'react';
import {
  editReview,
  getReviewImages,
  removeReview,
  REVIEWS_PER_PAGE,
} from '../../apis/review.api';
import { ReviewData } from '../../types/review.type';
import Button from '../common/Button';
import PaginationComp from '../common/PaginationComp';
import ReviewEdit from './ReviewEdit';
import React from 'react';
import Star from '../common/Star';
import { MdInbox } from 'react-icons/md';
import { formatDate } from '../../utils/format';

function ReviewBox({ reviews, total, page, onPageChange, onReload }) {
  const user = useSelector((state: RootState) => state.auth.user);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  /*
   * 펼쳐서 받아 온 사진을 후기 번호별로 들고 있습니다.
   * 목록에는 장수만 실려 있어서, 접었다 다시 펴도 다시 받지 않도록 남겨 둡니다.
   */
  const [imagesById, setImagesById] = useState<Record<number, string[]>>({});

  const startEditing = (review: ReviewData) => {
    setEditingReviewId(review.review_id);
  };

  const handleEditReview = async (
    reviewId: number,
    updatedRating: number,
    updatedContent: string,
    updatedImages: string[]
  ) => {
    try {
      await editReview(reviewId, updatedRating, updatedContent, updatedImages);
      setEditingReviewId(null);
      onReload();
    } catch (error) {
      console.error('리뷰 수정 중 오류 발생:', error);
    }
  };

  const handleRemoveReview = async (review: ReviewData) => {
    try {
      await removeReview(review.review_id);
      // 지우고 나면 그 자리에 다음 쪽 글이 올라와야 하므로 서버에서 다시 받습니다.
      onReload();
    } catch (error) {
      console.error('리뷰 삭제 중 오류 발생:', error);
    }
  };

  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);

  const handleClickReview = (review: ReviewData) => {
    const reviewId = review.review_id;
    setSelectedReviewId((prevId) => (prevId === reviewId ? null : reviewId));

    // 사진이 있는 글을 처음 펼칠 때만 받아옵니다.
    if (
      selectedReviewId !== reviewId &&
      review.image_count > 0 &&
      !imagesById[reviewId]
    ) {
      getReviewImages(reviewId).then((images) =>
        setImagesById((prev) => ({ ...prev, [reviewId]: images }))
      );
    }
  };

  return (
    <ReviewBoxStyle>
      <div>
        {reviews.length === 0 ? (
          <div className="noResults">
            <MdInbox className="emptyIcon" />
            <p>등록된 리뷰가 없습니다.</p>
          </div>
        ) : (
          <>
            <ul className="reviews">
              {reviews.map((review, index) => (
                <React.Fragment key={index}>
                  <li
                    className="review"
                    onClick={() => handleClickReview(review)}
                  >
                    <Star
                      rating={review.rating}
                      interactive={false}
                      key={review.rating}
                    />
                    <p>작성자 번호: {review.user_id}</p>
                    <p>작성 일자: {formatDate(review.created_at)}</p>
                  </li>
                  {selectedReviewId === review.review_id && (
                    <li className="reviewDetail">
                      {editingReviewId === review.review_id ? (
                        <ReviewEdit
                          review={review}
                          images={imagesById[review.review_id] ?? []}
                          onEdit={handleEditReview}
                          onCancel={() => setEditingReviewId(null)}
                        />
                      ) : (
                        <>
                          <div className="detailInfo">
                            <p className="createdAt">
                              작성 일시:{' '}
                              {formatDate(
                                review.created_at,
                                'YY.MM.DD HH.MM.SS'
                              )}
                            </p>
                            {review.user_id === user.id ? (
                              <div className="bttn">
                                <Button
                                  size="small"
                                  scheme="positive"
                                  onClick={() => startEditing(review)}
                                >
                                  수정
                                </Button>
                                <Button
                                  size="small"
                                  scheme="negative"
                                  onClick={() => handleRemoveReview(review)}
                                >
                                  삭제
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <div className="content">{review.review_content}</div>
                          {review.image_count > 0 && (
                            <ul className="reviewImages">
                              {(imagesById[review.review_id] ?? []).map(
                                (src, i) => (
                                  <li key={src.slice(0, 64) + i}>
                                    <img
                                      src={src}
                                      alt={`후기에 첨부된 사진 ${i + 1}`}
                                    />
                                  </li>
                                )
                              )}
                              {/* 받아오는 동안 자리를 잡아 둡니다. 없으면 글이 아래에서 튑니다. */}
                              {!imagesById[review.review_id] && (
                                <li className="loading">
                                  사진 {review.image_count}장 불러오는 중…
                                </li>
                              )}
                            </ul>
                          )}
                        </>
                      )}
                    </li>
                  )}
                </React.Fragment>
              ))}
            </ul>
            <PaginationComp
              totalItemsCount={total}
              itemsCountPerPage={REVIEWS_PER_PAGE}
              currentPage={page}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>
    </ReviewBoxStyle>
  );
}

export const ReviewBoxStyle = styled.div`
  .reviews {
    list-style: none;
    padding: 0;
  }

  .review {
    background-color: #f5f5f5;
    border-bottom: 1px solid #575757;
    padding: 1px;
    font-size: 12px;
    text-align: center;
    cursor: pointer;
    display: flex;
    justify-content: center;
    transition: 0.5s background-color;

    &:hover {
      background-color: #c3c3c3;
    }

    p {
      padding: 0px 5px;
      border-left: 1px solid #575757;
    }
  }

  .reviewDetail {
    background-color: #d9d9d9;
    border-bottom: 1px solid #575757;
    font-size: 12px;
    padding: 8px 13px;
  }

  .detailInfo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0px 5px;
  }

  /* 붙임 사진. 비율은 원본 그대로 두고 후기 칸을 넘지 않게만 잡습니다. */
  .reviewImages {
    display: flex;
    .loading {
      font-size: 12px;
      color: #575757;
    }
    flex-direction: column;
    gap: 6px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;

    img {
      display: block;
      max-width: 300px;
      max-height: 240px;
      border-radius: 8px;
    }
  }

  .content {
    width: 300px;
    height: 60px;
    padding: 10px;
    margin-top: 10px;
    border-radius: 8px;
    border: 1px solid #ddd;
    resize: none;
    font-size: 16px;
    color: #333;
    background-color: #f5f5f5;
    overflow-y: auto;
  }

  .bttn {
    display: flex;
    justify-content: end;
    gap: 5px;
  }

  .noResults {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 30px;

    .emptyIcon {
      width: 96px;
      height: 96px;
      color: #9e9e9e;
    }
    p {
      border-top: solid black;
      border-bottom: solid black;
      padding: 10px;
      font-size: 20px;
    }
  }
`;

export default ReviewBox;
