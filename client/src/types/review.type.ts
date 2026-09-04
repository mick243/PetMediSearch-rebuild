export interface ReviewData {
  review_id: number; // 리뷰id
  facility_id: number; // 장소id
  user_id: number;
  rating: number; // 별점(1~5)
  review_content: string; // 후기 내용
  created_at: string; // 작성일
}
