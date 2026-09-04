export interface PostState {
  post_id: number;
  category: string;
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
}
