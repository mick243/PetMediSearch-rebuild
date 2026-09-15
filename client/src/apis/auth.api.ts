import { httpClient } from './http';
import {
  AuthResponse,
  ChangePasswordInput,
  ChangePasswordResponse,
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
 * 비밀번호 변경.
 *
 * 지금 비밀번호를 함께 보냅니다. 서버는 같은 주소에서 15분에 실패 10번까지만
 * 받습니다(server/middleware/rateLimit.js 의 passwordChangeLimiter) — bcrypt 를
 * 도는 경로라 막아 두지 않으면 요청 제한이 아니라 부하 발생기가 됩니다.
 *
 * 성공하면 이전에 나간 토큰이 전부 끊기므로(다른 기기 포함) 새 토큰을 함께
 * 받습니다. 부르는 쪽에서 반드시 저장해야 합니다 — 안 그러면 바로 다음 요청이
 * 401 이 됩니다.
 */
export const changePassword = async (input: ChangePasswordInput) => {
  const res = await httpClient.patch<ChangePasswordResponse>(
    '/auth/me/password',
    input
  );
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
