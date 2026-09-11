import { ReviewData } from '../types/review.type';
import { httpClient } from './http';

/** 한 쪽에 보여 줄 후기 수. 서버 기본값과 같습니다. */
export const REVIEWS_PER_PAGE = 5;

/**
 * 시설별 후기 한 쪽.
 *
 * 후기에 사진이 붙으면서 전부 받으면 한 시설에 14MB 가 나왔습니다.
 * 보고 있는 쪽만 받고, 쪽 번호를 그리는 데 쓸 총계를 함께 받습니다.
 */
export const getReviewsByFacilityId = async (
  facilityId: number,
  page = 1,
  limit = REVIEWS_PER_PAGE
) => {
  try {
    const response = await httpClient.get<{
      reviews: ReviewData[];
      total: number;
    }>(`/reviews/facility/${facilityId}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('시설별 리뷰 조회 API 오류 발생:', error);
    throw error;
  }
};

/** 후기 한 건의 사진. 목록에는 장수만 실리므로 펼칠 때 이걸로 받아옵니다. */
export const getReviewImages = async (reviewId: number) => {
  try {
    const response = await httpClient.get<{ images: string[] }>(
      `/reviews/${reviewId}/images`
    );
    return response.data.images ?? [];
  } catch (error) {
    console.error('후기 사진 조회 API 오류 발생:', error);
    return [];
  }
};

// 리뷰 등록
export const addReview = async (
  userId: number,
  facilityId: number,
  rating: number,
  reviewContent: string,
  /** 줄인 JPEG data URL 목록. 안 붙였으면 빈 배열입니다 */
  images: string[] = []
) => {
  try {
    const response = await httpClient.post('/reviews', {
      user_id: userId,
      facility_id: facilityId,
      rating,
      review_content: reviewContent,
      images,
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
  reviewContent: string,
  /** 바꾼 사진 목록 전체. 빈 배열이면 다 뺐다는 뜻입니다 */
  images: string[] = []
) => {
  try {
    const response = await httpClient.put(`/reviews/${review_id}`, {
      rating,
      review_content: reviewContent,
      images,
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
