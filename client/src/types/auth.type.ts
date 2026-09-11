export interface AuthState {
  isLogin: boolean;
  user: UserState;
}

export interface UserState {
  id: number;
  username: string;
  /** 소셜 계정이면 'kakao' | 'naver' | 'google', 일반 가입 계정이면 빈 문자열입니다. */
  socialType: string;
  role: UserRole;
}

export type UserRole = 'user' | 'admin';

/** 일반 회원가입에서 받는 정보. 이름은 그대로 화면에 표시되는 이름이 됩니다. */
export interface SignupInput {
  username: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** /auth/signup · /auth/login 이 함께 돌려주는 모양입니다. */
export interface AuthResponse {
  token: string;
  user: UserState;
}
