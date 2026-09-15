const test = require('node:test');
const assert = require('node:assert');
const { emoticonToken, REMOVED_TOKEN, renumberReplacements } = require('./emoticonToken');

/*
 * 번호를 다시 매기는 순간이 이 기능에서 제일 위험한 자리입니다.
 * 규칙이 어긋나면 이미 올라간 댓글의 스티커가 통째로 한 칸씩 밀리는데, 밀린 것도
 * 멀쩡한 그림이라 화면만 봐서는 잘못된 줄 모릅니다. 여기서 못박아 둡니다.
 */

/** DB 의 REPLACE 중첩을 그대로 흉내 냅니다 — 순서대로 한 번씩 훑습니다. */
const apply = (content, pairs) =>
    pairs.reduce((text, [from, to]) => text.split(from).join(to), content);

test('가운데 것을 지우면 뒤엣것이 한 칸씩 당겨진다', () => {
    // 1,2,3,4 에서 2를 지움 -> 3은 2로, 4는 3으로.
    const pairs = renumberReplacements(2, [3, 4]);

    assert.strictEqual(apply('[emoticon:1]', pairs), '[emoticon:1]'); // 앞엣것은 그대로
    assert.strictEqual(apply('[emoticon:3]', pairs), '[emoticon:2]');
    assert.strictEqual(apply('[emoticon:4]', pairs), '[emoticon:3]');
});

test('두 칸씩 밀리지 않는다', () => {
    /*
     * 큰 번호부터 당기면 [4]->[3] 을 한 뒤 [3]->[2] 가 방금 만든 3까지 끌고
     * 내려가 4가 2가 됩니다. 한 칸만 움직여야 합니다.
     */
    const pairs = renumberReplacements(1, [2, 3, 4, 5]);
    assert.strictEqual(apply('[emoticon:5]', pairs), '[emoticon:4]');
    assert.strictEqual(apply('[emoticon:4]', pairs), '[emoticon:3]');
    assert.strictEqual(apply('[emoticon:2]', pairs), '[emoticon:1]');
});

test('지워진 것을 가리키던 댓글은 빈 자리로 보낸다', () => {
    /*
     * 그냥 두면 그 번호에 뒤엣것이 당겨 와서, 옛 댓글이 아무 말 없이 옆 스티커를
     * 가리킵니다. 0 으로 보내면 화면이 '(삭제된 이모티콘)' 으로 그립니다.
     */
    const pairs = renumberReplacements(2, [3]);
    assert.strictEqual(apply('[emoticon:2]', pairs), REMOVED_TOKEN);
    assert.strictEqual(REMOVED_TOKEN, '[emoticon:0]');
});

test('한 댓글에 여러 개가 섞여 있어도 각자 옮겨진다', () => {
    const pairs = renumberReplacements(2, [3, 4]);
    assert.strictEqual(
        apply('안녕[emoticon:1] 또[emoticon:2] 봐요[emoticon:4]', pairs),
        '안녕[emoticon:1] 또[emoticon:0] 봐요[emoticon:3]'
    );
});

test('이미 빈 자리로 보낸 옛 댓글은 다시 건드리지 않는다', () => {
    // 0 은 어떤 이모티콘도 갖지 않으므로 당겨질 일이 없습니다.
    const pairs = renumberReplacements(3, [4]);
    assert.strictEqual(apply(REMOVED_TOKEN, pairs), REMOVED_TOKEN);
});

test('맨 뒤엣것을 지우면 옮길 것이 없다', () => {
    const pairs = renumberReplacements(3, []);
    assert.deepStrictEqual(pairs, [[emoticonToken(3), REMOVED_TOKEN]]);
    assert.strictEqual(apply('[emoticon:1][emoticon:2]', pairs), '[emoticon:1][emoticon:2]');
});

test('번호가 열 개를 넘어도 앞자리만 보고 잘못 바꾸지 않는다', () => {
    // [emoticon:1] 규칙이 [emoticon:12] 를 건드리면 안 됩니다 — 대괄호까지 함께 봅니다.
    const pairs = renumberReplacements(1, [2, 12]);
    assert.strictEqual(apply('[emoticon:12]', pairs), '[emoticon:11]');
    assert.strictEqual(apply('[emoticon:2]', pairs), '[emoticon:1]');
});
