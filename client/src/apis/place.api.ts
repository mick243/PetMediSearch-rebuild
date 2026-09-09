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

/** 격자로 묶인 집계 결과 */
export interface PlaceCluster {
  lat: number;
  lng: number;
  count: number;
  hospitalCount: number;
  pharmacyCount: number;
}

interface ClusterParams {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  /** 격자 크기(소수점 자리수). 0 = 약 111km, 1 = 약 11km, 2 = 약 1.1km */
  precision: number;
  type?: string;
  keyword?: string;
}

/**
 * 화면 범위의 시설을 격자별 개수로 받아옵니다.
 *
 * 개별 레코드는 limit 으로 잘리기 때문에 잘려나간 지역이 지도에서 사라집니다.
 * 줌이 넓을 때는 이 집계를 써서 화면 전체를 빠짐없이 덮습니다.
 */
export const fetchPlaceClusters = async (
  params: ClusterParams
): Promise<PlaceCluster[]> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  try {
    const response = await httpClient.get(`/facilities/clusters?${query}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('시설 집계를 불러오던 중 오류 발생:', error);
    throw new Error('Failed to fetch place clusters');
  }
};

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
