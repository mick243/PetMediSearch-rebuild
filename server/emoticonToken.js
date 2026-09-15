/*
 * 댓글 본문에 남는 이모티콘 표시와, 번호를 다시 매길 때의 옮겨 적기 규칙.
 *
 * 컨트롤러가 아니라 여기 둔 이유는 controller/emoticon.js 를 require 하면 DB 풀까지
 * 딸려 와서 테스트에서 부르기 어렵기 때문입니다 (search.js 와 같은 이유).
 *
 * 화면 쪽 짝은 client/src/utils/emoticon.ts 입니다. 두 곳이 같은 모양을 써야 합니다.
 */

/** 댓글에 남기는 표시. 그림 대신 이것만 본문에 들어갑니다. */
const emoticonToken = (id) => `[emoticon:${id}]`;

/**
 * 지워진 자리.
 *
 * AUTO_INCREMENT 가 1부터라 0 은 어떤 이모티콘도 갖지 않습니다. 화면은 이 번호를
 * 보면 요청도 보내지 않고 바로 '(삭제된 이모티콘)' 으로 그립니다.
 */
const REMOVED_TOKEN = emoticonToken(0);

/**
 * 하나를 지우고 뒤엣것을 한 칸씩 당길 때, 댓글의 표시를 어떻게 바꿔야 하는지.
 * [바꿀 것, 바뀔 것] 을 **적용할 순서대로** 돌려줍니다.
 *
 * 순서가 전부입니다. [D]->[0] 을 먼저 하고, 그다음 [D+1]->[D], [D+2]->[D+1] ...
 * 으로 갑니다. 매 단계가 만들어 내는 번호(D, D+1 ...)는 그다음 단계가 찾는
 * 번호(D+2, D+3 ...)보다 항상 작아서, 방금 바꾼 것을 다음 단계가 또 건드리지
 * 않습니다. 거꾸로 큰 번호부터 당기면 [4]->[3] 을 한 뒤 [3]->[2] 가 그것까지
 * 같이 끌고 내려가 두 칸을 움직입니다.
 *
 * 지워지는 것을 가리키던 댓글을 0 으로 보내는 것도 꼭 필요합니다. 그냥 두면 그
 * 자리에 뒤엣것이 당겨 와서, 옛 댓글이 아무 말 없이 옆 스티커를 가리킵니다.
 */
const renumberReplacements = (removedId, shiftedIds) => [
    [emoticonToken(removedId), REMOVED_TOKEN],
    ...shiftedIds.map((id) => [emoticonToken(id), emoticonToken(id - 1)]),
];

module.exports = { emoticonToken, REMOVED_TOKEN, renumberReplacements };
