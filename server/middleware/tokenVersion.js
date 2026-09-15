const conn = require('../mysql');
const { logError } = require('../logError');
const { verifyToken } = require('../controller/authUser');

/**
 * 거둬들인 토큰을 여기서 끊습니다.
 *
 * JWT 는 한 번 나가면 만료(하루) 전까지 되돌릴 방법이 없습니다. 비밀번호를 바꿔도
 * 남의 기기에 남아 있던 로그인이 그대로 살아 있었습니다 — 비밀번호가 샜다고
 * 생각해 바꾼 사람에게는 그게 바꾼 이유인데 정작 그 사람만 쫓아내지 못했습니다.
 *
 * users.token_version 을 토큰에 함께 실어 보내고(controller/auth.js 의
 * generateToken), 여기서 DB 값과 맞춰 봅니다. 비밀번호 변경·탈퇴 때 그 값을
 * 올리므로, 그 순간 이전에 나간 토큰은 전부 어긋나 401 이 됩니다.
 *
 * 컨트롤러를 고치지 않으려고 미들웨어로 둡니다. 토큰을 보는 곳이 19군데라
 * 전부 비동기로 바꾸면 손댈 곳이 많고 그만큼 잘못 고칠 자리도 늘어납니다.
 * 여기서 먼저 걸러 내면 컨트롤러가 보는 토큰은 이미 살아 있는 것뿐입니다.
 *
 * 비용은 토큰을 들고 온 요청에만 붙습니다. 기본키 한 행 조회라 가볍고, 지도·목록
 * 처럼 로그인 없이 도는 길(전체 요청의 대부분)은 아예 지나갑니다.
 * 그래서 app.js 에서도 그 경로들보다 **뒤에** 붙입니다.
 */
const revokeStaleTokens = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();

    // 서명이 틀렸거나 만료된 토큰은 이 미들웨어가 할 일이 없습니다. 그대로 넘깁니다.
    const decoded = verifyToken(token);
    if (!decoded) return next();

    /*
     * 이 마이그레이션 전에 나간 토큰에는 v 가 없습니다. 없는 것을 0 으로 보고
     * 컬럼 기본값도 0 이라, 배포하는 순간 모두가 로그아웃되지는 않습니다.
     */
    const claimed = Number(decoded.v ?? 0);

    conn.query(
        'SELECT token_version FROM users WHERE user_id = ?',
        [decoded.id],
        (err, rows) => {
            if (err) {
                logError('auth:tokenVersion', err);
                return res.status(500).json({ message: '서버 오류 발생' });
            }

            /*
             * 계정 행이 아예 없으면 넘깁니다. 인증이 필요한 곳은 컨트롤러가 다시
             * 보고 401·404 로 답합니다. 탈퇴는 행을 남기므로 보통 여기 걸리지 않습니다.
             */
            if (rows.length === 0) return next();

            if (Number(rows[0].token_version) !== claimed) {
                /*
                 * 여기서 401 로 끝내지 않고 **헤더만 떼고** 보냅니다.
                 *
                 * 401 을 주면 로그인 없이도 도는 길(/category·/posts·/comments 처럼
                 * 비회원도 보는 목록)까지 막힙니다. 끊긴 토큰이 브라우저에 남아
                 * 있다는 이유만으로 글 목록을 못 보게 되는데, 그건 이 장치가
                 * 하려던 일이 아닙니다. 실제로 그렇게 만들었다가 401 셋을 보고
                 * 고쳤습니다.
                 *
                 * 떼고 보내면 이 요청은 비회원이 보낸 것과 똑같아집니다 —
                 * 공개된 길은 그대로 돌고, 인증이 필요한 길은 컨트롤러가 토큰이
                 * 없는 경우와 같은 401 을 돌려줍니다. 화면은 상태 코드로
                 * 판단하므로(client/src/apis/http.ts) 로그인 화면으로 넘어가는
                 * 동작도 그대로입니다.
                 */
                delete req.headers.authorization;
            }

            return next();
        }
    );
};

module.exports = { revokeStaleTokens };
