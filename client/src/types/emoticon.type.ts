/**
 * 댓글에 넣는 이모티콘. 관리자가 등록한 것만 있습니다.
 *
 * 목록에는 그림이 들어 있지 않습니다 — 스티커 30개를 다 실으면 1MB 가 넘는데
 * 화면은 피커를 열기 전까지 한 장도 그리지 않습니다. 그림은 필요할 때
 * emoticonImageUrl() 주소로 한 장씩 받아 갑니다 (서버 controller/emoticon.js).
 *
 * 본문에 남는 [emoticon:12] 표시를 다루는 함수들은 utils/emoticon.ts 에 있습니다.
 */
export interface Emoticon {
  emoticon_id: number;
  name: string;
}
