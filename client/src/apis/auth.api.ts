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
