import { describe, it, expect } from 'vitest';
import { emoticonToken, splitEmoticons, TOKEN_BEFORE_CARET } from './emoticon';

/*
 * 표시를 만드는 쪽과 읽는 쪽이 어긋나면, 그림이던 것이 어느 날 갑자기
 * [emoticon:12] 라는 글자로 보입니다. 두 쪽을 같이 고정해 둡니다.
 */

describe('splitEmoticons', () => {
  it('만든 표시를 그대로 다시 읽는다', () => {
    expect(splitEmoticons(emoticonToken(12))).toEqual([
      { kind: 'emoticon', id: 12 },
    ]);
  });

  it('글자 사이에 낀 것을 제자리에 나눈다', () => {
    expect(splitEmoticons('고마워요[emoticon:3] 또 올게요')).toEqual([
      { kind: 'text', text: '고마워요' },
      { kind: 'emoticon', id: 3 },
      { kind: 'text', text: ' 또 올게요' },
    ]);
  });

  it('여러 개가 붙어 있어도 하나씩 센다', () => {
    expect(splitEmoticons('[emoticon:1][emoticon:2]')).toEqual([
      { kind: 'emoticon', id: 1 },
      { kind: 'emoticon', id: 2 },
    ]);
  });

  it('표시가 없으면 글자 하나로 둔다', () => {
    expect(splitEmoticons('그냥 댓글입니다')).toEqual([
      { kind: 'text', text: '그냥 댓글입니다' },
    ]);
    expect(splitEmoticons('')).toEqual([]);
  });

  it('부서진 표시는 글자로 남긴다', () => {
    // 지우다 만 것. 그림으로 바꾸지 않고 쓴 그대로 보여 줍니다.
    expect(splitEmoticons('[emoticon:12')).toEqual([
      { kind: 'text', text: '[emoticon:12' },
    ]);
    expect(splitEmoticons('[emoticon:]')).toEqual([
      { kind: 'text', text: '[emoticon:]' },
    ]);
    // 숫자가 아니면 표시가 아닙니다.
    expect(splitEmoticons('[emoticon:abc]')).toEqual([
      { kind: 'text', text: '[emoticon:abc]' },
    ]);
  });

  it('줄바꿈과 함께 있어도 글자를 잃지 않는다', () => {
    expect(splitEmoticons('첫 줄\n[emoticon:5]\n끝')).toEqual([
      { kind: 'text', text: '첫 줄\n' },
      { kind: 'emoticon', id: 5 },
      { kind: 'text', text: '\n끝' },
    ]);
  });
});

describe('TOKEN_BEFORE_CARET', () => {
  it('커서 바로 앞에 붙은 표시만 잡는다', () => {
    expect('안녕[emoticon:7]'.match(TOKEN_BEFORE_CARET)?.[0]).toBe(
      '[emoticon:7]'
    );
    // 뒤에 글자가 더 있으면 붙어 있는 것이 아닙니다.
    expect(TOKEN_BEFORE_CARET.test('[emoticon:7] 안녕')).toBe(false);
    expect(TOKEN_BEFORE_CARET.test('그냥 글자')).toBe(false);
  });
});
