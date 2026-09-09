import { httpClient } from './http';
import { PlaceData } from '../types/place.type';

interface PlaceParams {
  type?: string;
  keyword?: string;
  /** 지도 화면 범위. 네 값이 모두 있으면 보이는 영역만 조회합니다. */
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
  /** 한 번에 받아올 최대 건수. 지도 마커 렌더 한계를 넘지 않게 제한합니다. */
  limit?: number;
}

/**
 * 폐업한 시설은 목록에 노출하지 않습니다.
 *
 * LOCALDATA 원본에는 폐업 이력이 그대로 남아 있어(전체의 약 45%) 그대로 쓰면
 * 이미 문 닫은 곳이 검색 결과와 지도에 섞입니다.
 * fetchPlaces 를 거치는 모든 화면(지도/리뷰 목록)에 함께 적용됩니다.
 */
const isClosed = (place: PlaceData) =>
  place.dtlstatenm === '폐업' || place.trdstatenm === '폐업';

export const fetchPlaces = async (params: PlaceParams) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.append(key, value);
    }
  });

  const url = `/facilities?${query.toString()}`;

  try {
    const response = await httpClient.get(url);
    const places = response.data;

    if (!Array.isArray(places)) return places;
    return (places as PlaceData[]).filter((place) => !isClosed(place));
  } catch (error) {
    console.error(
      `Failed to fetch places with query: ${query.toString()}`,
      error
    );
    throw new Error('Failed to fetch places');
  }
};
