import { PlaceData } from '../types/place.type';

/**
 * 목록과 지도에 내보내지 않는 시설.
 *
 * LOCALDATA 원본에는 폐업 이력이 그대로 남아 있어(전체의 약 45%) 그대로 쓰면 이미 문
 * 닫은 곳이 검색 결과와 지도에 섞입니다. 폐업만 거르던 때는 말소 · 휴업한 곳도 그대로
 * 떠서, 찾아가도 문을 열지 않는 곳을 안내했습니다.
 *
 * 서버가 먼저 같은 규칙으로 거릅니다(server/search.ts 의 HIDDEN_FACILITY_STATES ·
 * HIDDEN_TRADE_STATES 와 같은 값이어야 합니다). 상세 상태만 보면 처음 보는 값이 빠져나가서
 * 영업 상태 묶음으로도 봅니다 — 전국 데이터에는 상세 '행정처분' 이 영업 상태로는 말소와
 * 같은 '취소/말소/만료/정지/중지' 묶음인 시설이 2곳 있습니다.
 */
export const HIDDEN_STATES = ['폐업', '말소', '휴업'];

/** trdstatenm 쪽 표기. 말소는 원본에서 이 한 덩어리 문자열로 옵니다. */
export const HIDDEN_TRADE_STATES = ['폐업', '휴업', '취소/말소/만료/정지/중지'];

export const isHiddenFacility = (
  place: Pick<PlaceData, 'dtlstatenm' | 'trdstatenm'>
) =>
  HIDDEN_STATES.includes(place.dtlstatenm) ||
  HIDDEN_TRADE_STATES.includes(place.trdstatenm ?? '');
