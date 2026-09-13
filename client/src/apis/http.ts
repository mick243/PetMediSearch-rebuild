import axios, { AxiosError } from 'axios';
import { getToken, removeToken, removeUser } from '../utils/localStorage';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const httpClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'content-type': 'application/json',
  },
  withCredentials: true,
});

// 요청 추가
httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/*
 * 로그인·가입 요청은 401 이 정상적인 답입니다 (비밀번호가 틀렸다는 뜻).
 * 여기서 로그인 화면으로 보내면, 로그인 실패 문구를 보여줄 새도 없이 화면이 새로 뜹니다.
 */
const isAuthRequest = (url?: string) =>
  Boolean(url && url.startsWith('/auth/'));

/** 여러 요청이 동시에 401 을 받아도 화면은 한 번만 넘깁니다. */
let movingToLogin = false;

/*
 * 토큰이 만료되면 로그인 화면으로 보냅니다.
 *
 * 토큰은 하루짜리인데 만료를 아무도 처리하지 않고 있었습니다. 하루가 지나면
 * 모든 버튼이 "유효하지 않은 토큰입니다" 로 실패하는데, 화면은 여전히 로그인한
 * 것처럼 보여서 사용자는 앱이 고장난 줄 알고 같은 버튼을 계속 눌렀습니다.
 *
 * 저장해 둔 토큰을 지우고 통째로 새로 띄웁니다. 페이지가 다시 뜨면서 Redux 의
 * 로그인 상태도 저장소 기준으로 복원돼 비로그인으로 맞춰집니다.
 */
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401 && !isAuthRequest(error.config?.url) && !movingToLogin) {
      movingToLogin = true;
      removeToken();
      removeUser();

      if (window.location.pathname !== '/login') {
        // replace 라 뒤로가기로 만료된 화면에 돌아오지 않습니다.
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  }
);
