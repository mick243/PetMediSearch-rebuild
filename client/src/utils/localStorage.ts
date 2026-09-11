import { UserState } from '../types/auth.type';

export const getToken = () => {
  const token = localStorage.getItem('token');
  return token;
};

export const setToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// user 정보 관련 함수
export const getUser = (): UserState | null => {
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  const parsed = JSON.parse(userData) as Partial<UserState>;
  // role 은 나중에 생긴 값이라, 이전에 로그인해 둔 브라우저에는 없을 수 있습니다.
  return { role: 'user', ...parsed } as UserState;
};

export const setUser = (user: UserState) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = () => {
  localStorage.removeItem('user');
};
