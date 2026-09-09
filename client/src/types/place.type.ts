export interface PlaceData {
  id: number;
  bplcnm: string; // 장소명
  type: string; // 장소종류(병원 | 약국)
  sitewhladdr: string; // 주소지
  rdnwhladdr: string; // 주소지(도로명)
  sitetel: string; // 전화번호
  x: number | null; // 원본 TM 좌표(EPSG:5181)
  y: number | null; // 원본 TM 좌표(EPSG:5181)
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
}
