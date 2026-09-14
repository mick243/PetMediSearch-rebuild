import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array } from './push';

/*
 * VAPID 공개키를 브라우저가 받는 모양으로 바꾸는 자리.
 *
 * 여기서 틀리면 화면에는 "알림을 켜지 못했습니다" 만 뜹니다. 무엇이 잘못됐는지
 * 알 길이 없어, 값을 눈으로 확인할 수 있는 테스트를 붙여 둡니다.
 */
describe('urlBase64ToUint8Array', () => {
  it('URL-safe 문자를 되돌린다', () => {
    // '-' 와 '_' 는 표준 base64 의 '+' 와 '/' 자리입니다.
    expect([...urlBase64ToUint8Array('-_8')]).toEqual([0xfb, 0xff]);
  });

  it('= 로 길이를 맞춰야 하는 값도 읽는다', () => {
    // 'AQ' 는 그대로 atob 에 넣으면 길이가 2 라 던집니다. '==' 를 붙여야 합니다.
    expect([...urlBase64ToUint8Array('AQ')]).toEqual([0x01]);
    expect([...urlBase64ToUint8Array('AQI')]).toEqual([0x01, 0x02]);
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([0x01, 0x02, 0x03]);
  });

  it('= 가 이미 붙어 있어도 그대로 읽는다', () => {
    expect([...urlBase64ToUint8Array('AQ==')]).toEqual([0x01]);
  });

  it('VAPID 공개키는 65바이트가 된다', () => {
    // 실제 키 길이입니다. 65가 아니면 PushManager 가 구독을 거절합니다.
    const key =
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    expect(urlBase64ToUint8Array(key).length).toBe(65);
  });
});
