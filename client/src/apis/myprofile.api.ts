import { PostState } from '../types/post.type';
import { ReviewData } from '../types/review.type';
import { httpClient } from './http';

export const getPostsByUserId = async () => {
  try {
    const response = await httpClient.get<PostState[]>(`/mypage/posts`);
    return response.data;
  } catch (error) {
    console.error('사용자별 게시글 조회 API 오류 발생:', error);
    throw error;
  }
};

export const getReviewsByUserId = async () => {
  try {
    const response = await httpClient.get<ReviewData[]>(`/mypage/reviews`);
    return response.data;
  } catch (error) {
    console.error('사용자별 리뷰 조회 API 오류 발생:', error);
    throw error;
  }
};
