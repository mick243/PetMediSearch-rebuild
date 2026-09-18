const test = require('node:test');
const assert = require('node:assert');
const { findRemoteResource } = require('./postImages');

/*
 * 글 하나로 게시판을 연 모든 사람의 IP 가 남의 서버에 남을 수 있는 자리입니다.
 * 막는 규칙이 느슨해지면 조용히 다시 열리므로 여기서 못박습니다.
 */

const 통과 = (html) => assert.strictEqual(findRemoteResource(html), null, `막지 말아야 하는데 막았습니다: ${html}`);
const 막힘 = (html) => assert.notStrictEqual(findRemoteResource(html), null, `막아야 하는데 통과했습니다: ${html}`);

test('에디터가 만드는 평범한 글은 통과한다', () => {
    통과('<p>강남 동물병원에서 접종했어요.</p>');
    통과('<p><strong>굵게</strong> 쓰고 <em>기울이고</em></p><ul><li>목록</li></ul>');
    통과('<p><a href="https://example.com">바깥 링크</a></p>'); // 링크는 눌러야 갑니다
    통과('');
    통과(undefined);
});

test('줄인 사진(data URL)은 통과한다', () => {
    통과('<p><img src="data:image/jpeg;base64,/9j/4AAQSkZJRg=="></p>');
    통과("<p><img src='data:image/png;base64,iVBORw0KGgo='></p>");
});

test('남의 서버 이미지는 막는다', () => {
    막힘('<p><img src="https://evil.example/tracker.gif"></p>');
    막힘('<p><img src="http://evil.example/p.png"></p>');
    막힘('<p><img src=//evil.example/p.png></p>');
    막힘('<p><img src=/../../etc/passwd></p>');
});

test('따옴표 없이 쓴 것도 막는다', () => {
    막힘('<img src=x onerror=alert(1)>');
});

test('style 의 background-image 도 막는다', () => {
    막힘('<p style="background-image:url(https://evil.example/p.png)">x</p>');
    막힘("<div style=\"background:url('http://evil.example/p.png')\">x</div>");
});

test('에디터가 만들지 않는 속성은 막는다', () => {
    막힘('<img srcset="https://evil.example/p.png 1x">');
    막힘('<video poster="https://evil.example/p.jpg"></video>');
    막힘('<object data="https://evil.example/x.swf"></object>');
    막힘('<body background="https://evil.example/p.png">');
});

test('data-* 속성은 막지 않는다', () => {
    통과('<p data-id="3">보통 글</p>');
});

test('사진 여러 장 중 하나만 바깥이어도 막는다', () => {
    막힘(
        '<p><img src="data:image/jpeg;base64,/9j/4AAQ=="></p>' +
        '<p><img src="https://evil.example/second.png"></p>'
    );
});
