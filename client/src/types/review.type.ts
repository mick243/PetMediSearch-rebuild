export interface ReviewData {
  review_id: number; // 리뷰id
  facility_id: number; // 장소id
  user_id: number;
  rating: number; // 별점(1~5)
  review_content: string; // 후기 내용
  /**
   * 붙은 사진 장수. 사진 자체는 목록에 싣지 않고 펼칠 때 따로 받아옵니다
   * (한 장이 100KB 를 넘어 목록에 실으면 한 쪽이 수백 KB 가 됩니다).
   */
  image_count: number;
  created_at: string; // 작성일
}
