/*
 * 올라온 이미지의 형식을 정합니다.
 *
 * 컨트롤러가 아니라 여기 둔 이유는 controller/emoticon.js 를 require 하면 DB 풀까지
 * 딸려 와서 테스트에서 부르기 어렵기 때문입니다 (search.js 와 같은 이유).
 */

/**
 * 파일 앞머리로 알아보는 형식.
 *
 * 브라우저가 붙여 준 형식 이름(data URL 의 앞부분, 파일의 확장자)은 보지 않습니다.
 * 그 값을 그대로 저장하면 나중에 이 서버가 내보내는 Content-Type 이 되는데,
 * 이름만 image/png 인 다른 무언가를 올려도 막을 방법이 없어집니다.
 * 바이트가 말하는 것만 받습니다.
 *
 * SVG 가 목록에 없는 것도 같은 이유입니다 — 스크립트가 들어갑니다
 * (후기 사진의 IMAGE_DATA_URL 에서도 같이 막고 있습니다).
 */
const SIGNATURES = [
    { mime: 'image/jpeg', head: [0xff, 0xd8, 0xff] },
    { mime: 'image/png', head: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    // GIF87a · GIF89a 둘 다 'GIF8' 로 시작합니다.
    { mime: 'image/gif', head: [0x47, 0x49, 0x46, 0x38] },
];

/** 아는 형식이면 그 mime, 아니면 null. */
const sniffImageMime = (bytes) =>
    SIGNATURES.find((sig) => sig.head.every((byte, i) => bytes[i] === byte))?.mime ?? null;

/**
 * data URL 껍데기.
 *
 * 앞머리의 형식 이름은 무엇이든 받아 두고(어차피 믿지 않습니다) 모양만 봅니다.
 * base64 글자만 허용해서, Buffer.from 이 이상한 글자를 조용히 건너뛰는 일을 막습니다.
 */
const BASE64_IMAGE = /^data:image\/[a-z.+-]+;base64,([A-Za-z0-9+/]+={0,2})$/;

/** data URL 을 바이트로. 모양이 아니면 null 입니다. */
const parseImageDataUrl = (raw) => {
    const matched = BASE64_IMAGE.exec(String(raw ?? ''));
    return matched ? Buffer.from(matched[1], 'base64') : null;
};

module.exports = { sniffImageMime, parseImageDataUrl };
