export interface AuthState {
  isLogin: boolean;
  user: UserState;
}

export interface UserState {
  id: number;
  username: string;
  socialType: string;
}
