const test = require('node:test');
const assert = require('node:assert');
const { sniffImageMime, parseImageDataUrl } = require('./imageType');

/*
 * 여기가 뚫리면 올린 사람이 적어 준 형식이 그대로 Content-Type 이 되어 나갑니다.
 * 이름만 이미지인 것을 실제로 올려 보고 400 이 나는 것까지 확인했지만,
 * 규칙 자체는 눈으로 읽어서는 맞는지 알 수 없어 여기 고정해 둡니다.
 */

const withHead = (...bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(32)]);

test('sniffImageMime: JPG · PNG · GIF 는 앞머리로 알아본다', () => {
    assert.strictEqual(sniffImageMime(withHead(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
    assert.strictEqual(
        sniffImageMime(withHead(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
        'image/png'
    );
    // GIF87a 와 GIF89a 를 모두 받습니다.
    assert.strictEqual(sniffImageMime(Buffer.from('GIF87a....')), 'image/gif');
    assert.strictEqual(sniffImageMime(Buffer.from('GIF89a....')), 'image/gif');
});

test('sniffImageMime: 이름만 이미지인 것은 걸러낸다', () => {
    // 스크립트가 들어가는 형식들. data URL 앞머리에 image/png 라고 적어도 여기서 막힙니다.
    assert.strictEqual(sniffImageMime(Buffer.from('<svg xmlns="..."><script/></svg>')), null);
    assert.strictEqual(sniffImageMime(Buffer.from('<!doctype html><script>')), null);
    // 목록에 없는 이미지 형식도 받지 않습니다.
    assert.strictEqual(sniffImageMime(Buffer.from('RIFF....WEBPVP8 ')), null);
    assert.strictEqual(sniffImageMime(Buffer.from('BM....')), null);
});

test('sniffImageMime: 앞머리보다 짧아도 터지지 않는다', () => {
    assert.strictEqual(sniffImageMime(Buffer.alloc(0)), null);
    // PNG 앞머리 8바이트 중 앞의 4바이트만 맞는 경우.
    assert.strictEqual(sniffImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47])), null);
});

test('parseImageDataUrl: data URL 을 바이트로 되돌린다', () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02]);
    const url = `data:image/jpeg;base64,${bytes.toString('base64')}`;
    assert.deepStrictEqual(parseImageDataUrl(url), bytes);
});

test('parseImageDataUrl: data URL 이 아니면 null', () => {
    // 저장해 두면 보는 사람의 브라우저가 그 주소를 대신 불러 주게 됩니다.
    assert.strictEqual(parseImageDataUrl('https://example.com/a.png'), null);
    assert.strictEqual(parseImageDataUrl('data:text/html;base64,PHNjcmlwdD4='), null);
    // base64 가 아닌 글자가 섞이면 통째로 거절합니다 — 조용히 건너뛰지 않게.
    assert.strictEqual(parseImageDataUrl('data:image/png;base64,ab*cd'), null);
    assert.strictEqual(parseImageDataUrl(''), null);
    assert.strictEqual(parseImageDataUrl(undefined), null);
    assert.strictEqual(parseImageDataUrl(null), null);
});
