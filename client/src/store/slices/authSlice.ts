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

const initialState: AuthState = {
  isLogin: getToken() ? true : false,
  user: getUser() || { id: 0, username: '', socialType: '' }, // 로컬 스토리지에서 유저 정보 복원
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
      state.user = { id: 0, username: '', socialType: '' };
    },
  },
});

export const { setLogin, setLogout } = authSlice.actions;
export const authReducer = authSlice.reducer;
