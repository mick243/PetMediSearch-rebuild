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

/**
 * 시설 후기의 AI 요약. 후기가 5건 이상인 시설에만 오고, 아니면 목록 응답의 summary 가 null 입니다.
 * 서버(server/controller/reviewSummary.js)가 만들어 저장해 둔 것을 그대로 받습니다.
 */
export interface ReviewSummary {
  summary: string;
  /** 여러 후기가 좋았다고 한 점. 0~3개 */
  good: string[];
  /** 여러 후기가 아쉬웠다고 한 점. 0~3개 */
  caution: string[];
  /** 요약을 만들 때 근거로 삼은 후기 수 */
  review_count: number;
  updated_at: string;
}
