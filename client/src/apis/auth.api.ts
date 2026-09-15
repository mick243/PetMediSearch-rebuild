import { httpClient } from './http';
import {
  AuthResponse,
  LoginInput,
  MyAccount,
  SignupRequest,
  UpdateMyAccountInput,
} from '../types/auth.type';

export const signup = async (input: SignupRequest) => {
  const res = await httpClient.post<AuthResponse>('/auth/signup', input);
  return res.data;
};

export const login = async (input: LoginInput) => {
  const res = await httpClient.post<AuthResponse>('/auth/login', input);
  return res.data;
};

/**
 * 내 정보 (이름·이메일·전화번호).
 *
 * 로그인 응답에는 이름만 실려 있어, 수정 칸을 열 때 여기서 따로 받아옵니다.
 */
export const getMyAccount = async () => {
  const res = await httpClient.get<MyAccount>('/auth/me');
  return res.data;
};

/** 내 정보 수정. 바뀐 뒤의 값을 그대로 돌려받습니다. */
export const updateMyAccount = async (input: UpdateMyAccountInput) => {
  const res = await httpClient.patch<MyAccount>('/auth/me', input);
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
