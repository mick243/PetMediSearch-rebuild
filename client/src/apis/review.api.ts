import { ReviewData } from '../types/review.type';
import { httpClient } from './http';

// 시설 ID에 따른 리뷰 조회
export const getReviewsByFacilityId = async (facilityId: number) => {
  try {
    const response = await httpClient.get<ReviewData[]>(
      `/reviews/facility/${facilityId}`
    );
    return response.data;
  } catch (error) {
    console.error('시설별 리뷰 조회 API 오류 발생:', error);
    throw error;
  }
};

// 리뷰 등록
export const addReview = async (
  userId: number,
  facilityId: number,
  rating: number,
  reviewContent: string
) => {
  try {
    const response = await httpClient.post('/reviews', {
      user_id: userId,
      facility_id: facilityId,
      rating,
      review_content: reviewContent,
    });
    return response.data;
  } catch (error) {
    console.error('리뷰 등록 API 오류 발생:', error);
    throw error;
  }
};

// 리뷰 수정
export const editReview = async (
  review_id: number,
  rating: number,
  reviewContent: string
) => {
  try {
    const response = await httpClient.put(`/reviews/${review_id}`, {
      rating,
      review_content: reviewContent,
    });
    return response.data;
  } catch (error) {
    console.error('리뷰 수정 API 오류 발생:', error);
    throw error;
  }
};

// 리뷰 삭제
export const removeReview = async (review_id: number) => {
  try {
    const response = await httpClient.delete(`/reviews/${review_id}`);
    return response.data;
  } catch (error) {
    console.error('리뷰 삭제 API 오류 발생:', error);
    throw error;
  }
};
