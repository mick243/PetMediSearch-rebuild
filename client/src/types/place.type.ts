export interface PlaceData {
  id: number;
  bplcnm: string; // 장소명
  type: string; // 장소종류(병원 | 약국)
  sitewhladdr: string; // 주소지
  rdnwhladdr: string; // 주소지(도로명)
  sitetel: string; // 전화번호
  x: number | null; // WTM 좌표(위도)
  y: number | null; // WTM 좌표(경도)
  dtlstatenm: string; // 영업 상태(정상 | 폐업)
}

export interface PlaceState {
  data: PlaceData[]; //  장소 전체 데이터
  searchPlaceResults: PlaceData[]; // 장소 검색 결과
  searchInputPlace: string; // 검색하려는 장소명
  transformedResults: PlaceData[]; // 좌표 변환 결과
  selectedPlace: PlaceData | null; // 선택된 장소
}
