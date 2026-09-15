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
    /**
     * 마이페이지에서 이름을 바꾼 뒤 화면과 저장소를 맞춥니다.
     *
     * setLogin 을 다시 부르지 않는 이유는 그쪽이 토큰을 함께 받기 때문입니다.
     * 이름을 바꿔도 토큰은 그대로입니다 — 토큰에 담기는 것은 { id, role } 뿐입니다.
     *
     * localStorage 도 같이 씁니다. 안 쓰면 새로고침했을 때 authSlice 가 저장소를
     * 보고 복원하면서 옛 이름으로 되돌아갑니다.
     */
    setUsername: (state, { payload }: PayloadAction<string>) => {
      state.user = { ...state.user, username: payload };
      setUser(state.user);
    },
  },
});

export const { setLogin, setLogout, setUsername } = authSlice.actions;
export const authReducer = authSlice.reducer;
