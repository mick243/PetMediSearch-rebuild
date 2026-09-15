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
  /**
   * 그림의 지문. 주소에 실어 보냅니다 (emoticonImageUrl).
   *
   * 번호는 이모티콘을 지울 때마다 한 칸씩 당겨지므로, 번호만으로는 그림을 가리키는
   * 이름이 되지 못합니다. 이 값이 있어야 브라우저가 "3번 그림"과 "예전 3번 그림"을
   * 다른 것으로 봅니다.
   */
  v: string;
}
