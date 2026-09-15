import { Emoticon } from '../types/emoticon.type';
import { httpClient } from './http';

const BASE_URL = import.meta.env.VITE_BASE_URL;

/**
 * 이모티콘 그림 주소.
 *
 * axios 가 아니라 <img src> 로 직접 부릅니다. 그래야 브라우저가 보통 이미지처럼
 * 캐시해서, 같은 스티커가 여러 댓글에 나와도 내려받기는 한 번뿐입니다
 * (서버가 하루짜리 캐시를 걸어 둡니다).
 */
export const emoticonImageUrl = (id: number) =>
  `${BASE_URL}/emoticons/${id}/image`;

/** 등록된 이모티콘 목록. 그림은 오지 않고 id·이름만 옵니다. */
export const getEmoticons = async () => {
  const response = await httpClient.get<{ emoticons: Emoticon[] }>(
    '/emoticons'
  );
  return response.data.emoticons ?? [];
};

/**
 * 이모티콘 등록 (관리자만).
 *
 * image 는 data URL 입니다. 줄이거나 다시 굽지 않고 고른 파일 그대로 보냅니다 —
 * canvas 로 다시 그리면 GIF 는 첫 장만 남아 움직임이 사라지고, PNG 는 투명한
 * 배경이 검게 칠해집니다. 대신 크기 상한(512KB)을 서버와 화면 양쪽에서 봅니다.
 */
export const createEmoticon = async (name: string, image: string) => {
  const response = await httpClient.post<{
    message: string;
    emoticon: Emoticon;
  }>('/emoticons', { name, image });
  return response.data.emoticon;
};

export const deleteEmoticon = async (id: number) => {
  const response = await httpClient.delete<{ message: string }>(
    `/emoticons/${id}`
  );
  return response.data;
};
