const test = require('node:test');
const assert = require('node:assert');
const { cacheControlFor, IMMUTABLE, NO_STORE } = require('./emoticonImage');

/*
 * 여기를 잘못 두면 브라우저가 옛 그림을 붙들고 놓지 않습니다.
 * 실제로 겪었습니다 — 번호를 지우고 새로 등록했는데 화면에는 그 번호에 예전에
 * 있던 그림이 계속 나왔습니다. 지문이 맞을 때만 오래 담게 해야 합니다.
 */

const HASH = 'a1b2c3d4e5f60718';

test('지문이 맞으면 오래 담아도 된다', () => {
    assert.strictEqual(cacheControlFor(HASH, HASH), IMMUTABLE);
});

test('지문이 없으면 담지 않는다', () => {
    // /emoticons/3/image — 번호가 당겨지면 다른 그림을 뜻하게 되는 주소입니다.
    assert.strictEqual(cacheControlFor(undefined, HASH), NO_STORE);
    assert.strictEqual(cacheControlFor('', HASH), NO_STORE);
    assert.strictEqual(cacheControlFor(null, HASH), NO_STORE);
});

test('지문이 어긋나면 담지 않는다', () => {
    // 목록을 오래 들고 있던 브라우저가 옛 지문으로 물어본 경우.
    // 그림은 지금 것을 제대로 주되, 이 주소로는 담아 두지 않게 합니다.
    assert.strictEqual(cacheControlFor('0000000000000000', HASH), NO_STORE);
});

test('저장된 지문이 없으면 어떤 경우에도 담지 않는다', () => {
    // 마이그레이션 전 행처럼 지문이 비어 있으면, 물어본 값이 무엇이든 담지 않습니다.
    assert.strictEqual(cacheControlFor(HASH, undefined), NO_STORE);
    assert.strictEqual(cacheControlFor('', ''), NO_STORE);
    assert.strictEqual(cacheControlFor(undefined, undefined), NO_STORE);
});

test('오래 담는 지시에는 immutable 이 들어 있다', () => {
    // max-age 만으로는 만료 뒤 재검증이 일어납니다. 지문이 맞으면 그것도 필요 없습니다.
    assert.match(IMMUTABLE, /immutable/);
    assert.match(IMMUTABLE, /max-age=31536000/);
});
