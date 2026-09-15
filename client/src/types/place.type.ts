/**
 * 서버가 GET /facilities 로 내려주는 시설 한 건.
 *
 * 여기 있는 것이 전부입니다. 표에는 컬럼이 더 있지만 화면이 안 쓰는 것은
 * 서버가 보내지 않습니다 (server/app.js 의 FACILITY_COLUMNS).
 *
 * 원본 TM 좌표(x·y)도 그중 하나입니다. 지도는 x=위도·y=경도로 읽는데 그 값은
 * 서버가 보낸 것이 아니라 SearchMap 이 lat/lng 로 채워 넣은 것이라, 그쪽의
 * MappedPlace 에만 있습니다.
 */
export interface PlaceData {
  id: number;
  bplcnm: string; // 장소명
  type: string; // 장소종류(병원 | 약국)
  sitewhladdr: string; // 주소지
  rdnwhladdr: string; // 주소지(도로명)
  sitetel: string; // 전화번호
  lat?: number | null; // WGS84 위도 (서버가 적재 시 미리 변환)
  lng?: number | null; // WGS84 경도
  dtlstatenm: string; // 상세영업상태명(정상 | 폐업 | 말소 | 휴업)
  trdstatenm?: string; // 영업상태명(영업/정상 | 폐업)
}

export interface PlaceState {
  data: PlaceData[]; //  장소 전체 데이터
  searchPlaceResults: PlaceData[]; // 장소 검색 결과
  searchInputPlace: string; // 검색하려는 장소명
  selectedPlace: PlaceData | null; // 선택된 장소
  /**
   * 검색 버튼(Enter 포함)을 누른 횟수.
   *
   * searchPlaceResults 는 검색으로도, 지도 화면 범위 조회로도 바뀝니다.
   * 지도를 옮겨야 하는 건 검색뿐이라 그 둘을 가르는 신호가 따로 필요합니다.
   */
  searchSeq: number;
}
