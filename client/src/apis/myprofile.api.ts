import { MyComment, PostState } from '../types/post.type';
import { ReviewData } from '../types/review.type';
import { httpClient } from './http';

/*
 * 셋 다 실패를 여기서 찍지 않고 그대로 올려 보냅니다.
 * 화면이 이미 무엇을 못 불러왔는지와 함께 찍고 있어서, 여기서도 찍으면
 * 한 번의 실패가 콘솔에 두 줄로 남습니다.
 */

/** 내가 쓴 글 최근 20건. 지워진 글은 서버에서 빠집니다. */
export const getPostsByUserId = async () => {
  const response = await httpClient.get<PostState[]>(`/mypage/posts`);
  return response.data;
};

/** 내가 쓴 후기 최근 20건. */
export const getReviewsByUserId = async () => {
  const response = await httpClient.get<ReviewData[]>(`/mypage/reviews`);
  return response.data;
};

/** 내가 쓴 댓글 최근 20건. 지워진 글에 단 댓글은 서버에서 빠집니다. */
export const getCommentsByUserId = async () => {
  const response = await httpClient.get<MyComment[]>(`/mypage/comments`);
  return response.data;
};
