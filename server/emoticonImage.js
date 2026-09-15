/*
 * 이모티콘 그림을 얼마나 오래 담아 두게 할지 정합니다.
 *
 * 컨트롤러가 아니라 여기 둔 이유는 controller/emoticon.js 를 require 하면 DB 풀까지
 * 딸려 와서 테스트에서 부르기 어렵기 때문입니다 (search.js 와 같은 이유).
 */

/**
 * 그림이 바뀌지 않는다고 약속할 수 있을 때 주는 지시.
 *
 * 1년이고 immutable 이라 브라우저가 다시 묻지도 않습니다. 주소에 그림의 지문이
 * 실려 있어서 할 수 있는 말입니다 — 그림이 바뀌면 지문이 바뀌고, 그러면 주소가
 * 달라져 이 사본은 그냥 쓰이지 않게 됩니다.
 */
const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * 담아 두면 안 될 때 주는 지시.
 *
 * 지문 없이 /emoticons/3/image 로 들어온 요청입니다. 이 주소는 번호가 당겨지면
 * 다른 그림을 뜻하게 되므로, 한 번이라도 담아 두면 그 순간부터 남의 그림을
 * 내놓습니다. 실제로 그렇게 1,524바이트 PNG 자리에 4,715바이트 GIF 가 나왔습니다.
 */
const NO_STORE = 'no-store';

/**
 * 이 요청에 줄 Cache-Control.
 *
 * 지문이 맞을 때만 오래 담게 합니다. 어긋난 지문(목록을 오래 들고 있던 브라우저)도
 * 담지 않습니다 — 그림 자체는 지금 것을 제대로 내주므로, 틀린 그림이 보이는 일은
 * 없고 다음 요청에 다시 받아 갈 뿐입니다.
 */
const cacheControlFor = (askedHash, actualHash) =>
    askedHash && actualHash && askedHash === actualHash ? IMMUTABLE : NO_STORE;

module.exports = { cacheControlFor, IMMUTABLE, NO_STORE };
