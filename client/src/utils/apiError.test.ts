import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { apiErrorMessage, isUnauthorized } from './apiError';

/*
 * 서버 오류 문구 꺼내기.
 *
 * 화면마다 손으로 data.message 를 뒤지던 것을 한곳에 모은 것이라,
 * 여기가 틀리면 모든 화면이 같은 기본 문구만 보여 주게 됩니다.
 */

/** axios 오류를 흉내 냅니다. isAxiosError 표시가 있어야 같은 길로 갑니다. */
const axiosError = (status: number | null, data?: unknown) => {
  const error = new AxiosError('실패');
  if (status !== null) {
    error.response = { status, data } as AxiosError['response'];
  }
  return error;
};

describe('apiErrorMessage', () => {
  it('서버가 보낸 message 를 꺼낸다', () => {
    const error = axiosError(400, { message: '제목을 입력해주세요.' });
    expect(apiErrorMessage(error, '기본')).toBe('제목을 입력해주세요.');
  });

  it('옛 이름 error 도 본다', () => {
    // 서버가 message 와 error 를 섞어 쓰던 시절의 응답을 위해 남긴 길입니다.
    const error = axiosError(500, { error: '옛 방식 문구' });
    expect(apiErrorMessage(error, '기본')).toBe('옛 방식 문구');
  });

  it('message 가 error 보다 우선한다', () => {
    const error = axiosError(500, { message: '새 문구', error: '옛 문구' });
    expect(apiErrorMessage(error, '기본')).toBe('새 문구');
  });

  it('응답이 아예 없으면 네트워크 문제로 갈라 준다', () => {
    /*
     * 이걸 갈라주지 않으면 서버가 죽었을 때도 "저장하지 못했습니다" 만 떠서,
     * 사용자는 왜 안 되는지 모른 채 같은 버튼을 계속 누르게 됩니다.
     */
    expect(apiErrorMessage(axiosError(null), '저장하지 못했습니다.')).toBe(
      '서버에 연결하지 못했습니다. 네트워크를 확인해주세요.'
    );
  });

  it('본문이 비어 있으면 기본 문구', () => {
    expect(apiErrorMessage(axiosError(500, {}), '기본 문구')).toBe('기본 문구');
    expect(apiErrorMessage(axiosError(500), '기본 문구')).toBe('기본 문구');
  });

  it('axios 가 아닌 오류도 기본 문구로 떨어진다', () => {
    expect(apiErrorMessage(new Error('무언가'), '기본 문구')).toBe('기본 문구');
    expect(apiErrorMessage(undefined, '기본 문구')).toBe('기본 문구');
    expect(apiErrorMessage(null, '기본 문구')).toBe('기본 문구');
  });

  it('빈 문자열 message 는 기본 문구로 넘어간다', () => {
    // 빈 문구를 그대로 보여 주면 아무 설명 없는 창이 뜹니다.
    expect(apiErrorMessage(axiosError(500, { message: '' }), '기본')).toBe(
      '기본'
    );
  });
});

describe('isUnauthorized', () => {
  it('401 만 참', () => {
    expect(isUnauthorized(axiosError(401))).toBe(true);
    expect(isUnauthorized(axiosError(403))).toBe(false);
    expect(isUnauthorized(axiosError(500))).toBe(false);
    expect(isUnauthorized(new Error('무언가'))).toBe(false);
  });
});
