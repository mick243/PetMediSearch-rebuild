const rateLimit = require('express-rate-limit');

/*
 * 요청 제한.
 *
 * 지금까지는 로그인을 몇 번이든 시도할 수 있었습니다. 비밀번호는 8자 이상만
 * 요구하므로, 막지 않으면 흔한 비밀번호를 차례로 넣어 보는 것을 가만히 두는 셈입니다.
 * 가입도 마찬가지로 스팸 계정을 무한정 만들 수 있었습니다.
 *
 * 값은 "사람이 실수로 걸리지는 않되 자동 시도는 의미가 없어지는" 선으로 잡았습니다.
 * 비밀번호를 잘못 치는 것은 보통 서너 번이지 열 번이 아닙니다.
 */

const minutes = (n) => n * 60 * 1000;

/** 응답 모양을 서버의 다른 오류와 맞춥니다 ({ message } 하나). */
const handler = (message) => (req, res) => res.status(429).json({ message });

/**
 * 로그인. 같은 주소에서 15분에 **실패** 10번까지.
 *
 * skipSuccessfulRequests 는 성공한 요청을 세지 않는다는 뜻입니다. 자주 드나드는
 * 사람이 정상적인 로그인만으로 한도를 깎아 먹지 않습니다.
 * 다만 한 번 막히고 나면 올바른 비밀번호도 15분 동안 429 입니다 — 그게 이 장치의 목적입니다.
 *
 * 회사나 학교처럼 여러 사람이 한 주소를 쓰면 남의 실패가 내 로그인을 막을 수 있습니다.
 * 그런 환경까지 받아야 하면 주소 대신 이메일 단위로 세는 쪽으로 바꿔야 합니다.
 */
const loginLimiter = rateLimit({
    windowMs: minutes(15),
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: handler('로그인 시도가 너무 많습니다. 15분 뒤에 다시 시도해주세요.'),
});

/**
 * 비밀번호 변경. 같은 주소에서 15분에 **실패** 10번까지.
 *
 * 로그인과 버킷을 따로 두는 이유가 둘입니다.
 *
 *   ① 지금 비밀번호를 몇 번 잘못 친 것 때문에 로그인까지 막히면, 고치러 왔다가
 *      나가지도 못하게 됩니다.
 *   ② 비용이 로그인과 같습니다. 여기도 bcrypt(cost 12)를 돌리는데 그 한 번이
 *      283ms 입니다(docs/LoadTest-2026-09-15.md). 일반 상한(1분에 300번)에 두면
 *      한 주소가 1분에 85초어치 CPU 를 태울 수 있습니다 — 요청 제한이 아니라
 *      부하 발생기가 됩니다.
 *
 * skipSuccessfulRequests 는 제대로 바꾼 사람이 한도를 깎아 먹지 않게 합니다.
 */
const passwordChangeLimiter = rateLimit({
    windowMs: minutes(15),
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: handler('비밀번호 변경 시도가 너무 많습니다. 15분 뒤에 다시 시도해주세요.'),
});

/** 가입. 같은 주소에서 1시간에 5개까지. */
const signupLimiter = rateLimit({
    windowMs: minutes(60),
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: handler('가입 시도가 너무 많습니다. 잠시 뒤에 다시 시도해주세요.'),
});

/**
 * 그 밖의 모든 요청. 1분에 300번.
 *
 * 화면 한 번 뜰 때 대여섯 건이 나가므로 사람이 쓰다가 걸릴 수가 없는 값입니다.
 * 긁어 가는 쪽만 걸리라고 둔 상한입니다.
 */
const generalLimiter = rateLimit({
    windowMs: minutes(1),
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: handler('요청이 너무 많습니다. 잠시 뒤에 다시 시도해주세요.'),
});

module.exports = { loginLimiter, signupLimiter, passwordChangeLimiter, generalLimiter };
