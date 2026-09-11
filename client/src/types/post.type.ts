export interface PostState {
  post_id: number;
  category: string;
  /** 목록 조회가 함께 내려주는 분류. 통합 탭에서 어느 분류 글인지 칩으로 씁니다. */
  category_id?: number;
  category_name?: string;
  /** 상세 조회가 내려주는 작성자 id. 수정·삭제 버튼 노출 판단용. */
  user_id?: number;
  title: string;
  content: string;
  author?: string;
  username?: string;
  created_at: string;
}

export interface Category {
  category_id: number | null;
  category_name: string;
  isActive?: boolean;
}

export interface Comment {
  comment_id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  author: string;
  /** 답글이면 원댓글 id. 원댓글이면 null. */
  parent_comment_id?: number | null;
}

/**
 * 마이페이지의 "내가 쓴 댓글" 한 줄.
 *
 * 글의 댓글 목록(Comment)과 달리 작성자는 늘 나라서 빼고, 대신 어느 글에 단
 * 것인지 제목을 함께 받습니다.
 */
export interface MyComment {
  comment_id: number;
  post_id: number;
  post_title: string;
  content: string;
  created_at: string;
}
