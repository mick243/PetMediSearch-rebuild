import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, UserState } from '../../types/auth.type';
import {
  getToken,
  getUser,
  removeToken,
  removeUser,
  setToken,
  setUser,
} from '../../utils/localStorage';

/** 로그아웃 상태의 빈 사용자. 복원 실패 시에도 이 값으로 떨어집니다. */
const GUEST: UserState = { id: 0, username: '', socialType: '', role: 'user' };

const initialState: AuthState = {
  isLogin: getToken() ? true : false,
  user: getUser() || GUEST, // 로컬 스토리지에서 유저 정보 복원
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLogin: (
      state,
      { payload }: PayloadAction<{ token: string; user: UserState }>
    ) => {
      state.isLogin = true;
      setToken(payload.token);
      setUser(payload.user);
      state.user = payload.user;
    },
    setLogout: (state) => {
      state.isLogin = false;
      removeToken();
      removeUser();
      state.user = GUEST;
    },
  },
});

export const { setLogin, setLogout } = authSlice.actions;
export const authReducer = authSlice.reducer;
