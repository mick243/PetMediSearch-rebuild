/*
 * 글 본문(ReactQuill HTML)이 바깥에서 무언가를 받아오게 만드는지 검사합니다.
 *
 * 후기 사진은 controller/review.js 의 IMAGE_DATA_URL 이 data URL 만 받아 남의 서버
 * 주소를 막습니다. 글 본문에는 그 검사가 없어서 이런 글이 그대로 저장됐습니다.
 *
 *   <p><img src="https://남의서버/tracker.gif"></p>
 *
 * 저장되면 그 글을 여는 사람마다 브라우저가 그 주소를 대신 불러 줍니다. 목록의
 * 썸네일도 본문 첫 이미지를 쓰므로(client/src/utils/postContent.ts 의 firstImage),
 * 글 하나로 게시판 목록을 연 모든 사람의 IP 와 브라우저 정보가 남의 서버에 남습니다.
 * 글을 읽는 것은 누구나 할 수 있으니 로그인도 필요 없습니다.
 *
 * 화면에서 DOMPurify 가 <script> 는 지워 주지만, <img src> 는 정상 태그라 남깁니다.
 * 지우는 문제가 아니라 애초에 저장하지 않는 문제입니다.
 *
 * app.js 처럼 require 하는 순간 서버가 뜨는 곳에 두지 않습니다 (CLAUDE.md §6.7).
 */

/** 화면이 넣는 값과 같은 모양만 받습니다 (client/src/utils/image.ts 는 JPEG 로 줄입니다). */
const DATA_IMAGE = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/\s]+={0,2}$/i;

/** 값이 따옴표에 싸여 있을 수도, 맨몸일 수도 있습니다 (<img src=x onerror=...>). */
const SRC_ATTR = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

/**
 * 에디터가 만들지 않는 속성들. 하나라도 있으면 사람이 만든 요청이므로 막습니다.
 * 전부 바깥 주소를 받아올 수 있는 자리입니다(srcset·poster·object[data]·body[background]).
 */
const FORBIDDEN_ATTR = /\b(srcset|poster|background|lowsrc)\s*=/i;
const OBJECT_DATA_ATTR = /<\s*(object|embed)\b[^>]*\bdata\s*=/i;

/** style="background-image: url(...)" 도 같은 일을 합니다. */
const CSS_URL = /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi;

/**
 * 본문이 바깥 주소를 부르는지 봅니다.
 *
 * @param {string} html 글 본문
 * @returns {string|null} 문제가 된 주소(앞부분). 없으면 null.
 */
const findRemoteResource = (html) => {
    const text = String(html ?? '');

    if (FORBIDDEN_ATTR.test(text)) return text.match(FORBIDDEN_ATTR)[1];
    if (OBJECT_DATA_ATTR.test(text)) return 'object/embed';

    for (const m of text.matchAll(SRC_ATTR)) {
        const value = (m[1] ?? m[2] ?? m[3] ?? '').trim();
        if (!value) continue;
        if (!DATA_IMAGE.test(value)) return value.slice(0, 60);
    }

    for (const m of text.matchAll(CSS_URL)) {
        const value = (m[2] ?? '').trim();
        if (!value) continue;
        if (!DATA_IMAGE.test(value)) return value.slice(0, 60);
    }

    return null;
};

module.exports = { findRemoteResource, DATA_IMAGE };
