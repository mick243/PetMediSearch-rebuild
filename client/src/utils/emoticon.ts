/**
 * 댓글 본문에 남는 이모티콘 표시.
 *
 * 그림 자체를 본문에 박지 않고 이 짧은 표시만 남깁니다. 같은 이모티콘을 쓴 댓글이
 * 저마다 수십 KB 를 들고 다니지 않게 하려는 것입니다 — 그림은 표 하나에만 두고
 * GET /emoticons/:id/image 로 따로 받아 갑니다.
 *
 * 서버는 이 문자열을 특별하게 다루지 않습니다. 그냥 댓글 글자입니다.
 *
 * g 플래그는 일부러 뺐습니다. split 은 이 플래그를 보지 않고, 붙여 두면 모듈
 * 하나를 여러 곳에서 나눠 쓸 때 lastIndex 가 남아 엉뚱한 자리부터 찾습니다.
 */
const TOKEN = /\[emoticon:(\d+)\]/;

/** 표시를 만드는 쪽. 만드는 곳과 읽는 곳이 어긋나지 않게 한 군데 둡니다. */
export const emoticonToken = (id: number) => `[emoticon:${id}]`;

/**
 * 지워진 자리.
 *
 * 관리자가 이모티콘을 지우면 뒤엣것의 번호가 한 칸씩 당겨지고, 그 이모티콘을
 * 쓰던 댓글은 서버가 이 번호로 바꿔 둡니다 (server/emoticonToken.js). 그냥 두면
 * 빈 번호에 뒤엣것이 당겨 와서 옛 댓글이 옆 스티커를 가리키게 됩니다.
 *
 * 0 은 어떤 이모티콘도 갖지 않습니다 — 번호가 1부터 매겨지기 때문입니다.
 */
export const REMOVED_EMOTICON_ID = 0;

/** 커서 바로 앞에 붙어 있는 표시. 지울 때 한 글자처럼 다루려고 씁니다. */
export const TOKEN_BEFORE_CARET = /\[emoticon:\d+\]$/;

export type ContentPart =
  | { kind: 'text'; text: string }
  | { kind: 'emoticon'; id: number };

/**
 * 댓글 본문을 글자와 이모티콘으로 나눕니다.
 *
 * 본문을 HTML 로 해석하지 않고 조각으로만 나눕니다 — 남이 쓴 태그가 실행될 자리가
 * 없고, 그림 주소도 여기서 뽑은 숫자로만 만듭니다.
 * 빈 조각은 버립니다. 이모티콘만 있는 댓글은 앞뒤로 빈 문자열이 생깁니다.
 */
export const splitEmoticons = (content: string): ContentPart[] => {
  /* 괄호로 묶은 id 라 홀수 자리에 번호가, 짝수 자리에 글자가 들어옵니다. */
  const parts = content.split(TOKEN);

  return parts.flatMap((part, i): ContentPart[] => {
    if (i % 2 === 1) return [{ kind: 'emoticon', id: Number(part) }];
    return part === '' ? [] : [{ kind: 'text', text: part }];
  });
};
