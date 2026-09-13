import { httpClient } from './http';
import { AuthResponse, LoginInput, SignupInput } from '../types/auth.type';

export const signup = async (input: SignupInput) => {
  const res = await httpClient.post<AuthResponse>('/auth/signup', input);
  return res.data;
};

export const login = async (input: LoginInput) => {
  const res = await httpClient.post<AuthResponse>('/auth/login', input);
  return res.data;
};

/**
 * 회원 탈퇴.
 *
 * 쓴 글·댓글·후기는 함께 감춰지고, 반려동물과 즐겨찾기는 지워집니다.
 * 이메일·전화번호·주소는 서버에서 비워지며 되돌릴 수 없습니다.
 */
export const withdraw = async () => {
  const res = await httpClient.delete<{ message: string }>('/auth/me');
  return res.data;
};
