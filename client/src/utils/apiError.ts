import { AxiosError } from 'axios';

/** 서버가 오류와 함께 보내는 본문. message 하나로 통일돼 있습니다. */
interface ErrorBody {
  message?: string;
  /** 예전 이름. 서버가 섞어 쓰던 시절의 응답을 위해 남겨 둡니다 */
  error?: string;
}

/**
 * 서버가 보낸 오류 문구를 꺼냅니다.
 *
 * 예전에는 화면마다 `data.message` 와 `data.error` 를 손으로 뒤졌습니다.
 * 서버가 두 이름을 섞어 쓰던 탓인데(49곳 대 38곳), 한쪽만 보는 화면에서는
 * 서버가 보낸 문구가 묻히고 늘 같은 기본 문구만 떴습니다.
 *
 * 서버는 이제 message 하나로 보내지만, 화면과 서버 배포가 엇갈리는 동안을
 * 위해 옛 이름도 함께 봅니다.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ErrorBody> | undefined;

  /*
   * 응답이 아예 없으면 서버가 아니라 연결이 문제입니다.
   * 여기서 갈라주지 않으면 "저장하지 못했습니다" 만 뜨고, 왜 안 되는지
   * 알 길이 없어 같은 버튼을 계속 누르게 됩니다.
   */
  if (axiosError?.isAxiosError && !axiosError.response) {
    return '서버에 연결하지 못했습니다. 네트워크를 확인해주세요.';
  }

  const body = axiosError?.response?.data;
  return body?.message || body?.error || fallback;
}

/** 로그인이 필요하거나 만료된 경우. 화면에서 로그인으로 보낼 때 씁니다. */
export function isUnauthorized(error: unknown): boolean {
  return (error as AxiosError | undefined)?.response?.status === 401;
}
