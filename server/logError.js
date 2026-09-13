/*
 * 서버 오류를 로그에 남깁니다.
 *
 * 예전에는 console.error(err) 로 오류 객체를 통째로 찍었습니다. mysql2 의 오류는
 * 실행하려던 쿼리 전문(err.sql)을 들고 있어서, 사진이 붙은 글 하나가 실패하면
 * 100KB 짜리 base64 가 로그에 그대로 남았습니다. 글 본문·이메일·전화번호처럼
 * 값으로 들어간 개인정보도 같이 남습니다.
 *
 * 원인을 찾는 데 필요한 것은 오류 코드와 문구이지 쿼리 본문이 아닙니다.
 * 어떤 쿼리였는지는 코드와 맥락으로 찾을 수 있습니다.
 */

/**
 * @param {string} context 어디서 났는지. 예) 'addPostById'
 * @param {unknown} error 잡은 오류
 */
const logError = (context, error) => {
    if (!error || typeof error !== 'object') {
        console.error(`[${context}]`, error);
        return;
    }

    const { code, errno, sqlState, sqlMessage, message, name } = error;

    if (errno || sqlState) {
        // DB 오류. sqlMessage 에 어느 컬럼이 문제인지까지 들어 있습니다.
        console.error(`[${context}] ${code} (errno ${errno}, ${sqlState}): ${sqlMessage || message}`);
        return;
    }

    /*
     * 그 밖의 오류. axios 오류처럼 code 만 있는 것도 여기로 옵니다.
     * axios 오류를 통째로 찍으면 요청 config 가 딸려 나와 client_secret 까지 로그에 남습니다.
     */
    console.error(`[${context}] ${code || name || 'Error'}: ${message}`);

    // 코드가 없는 순수 자바스크립트 오류만 스택을 남깁니다. 어디서 났는지가 유일한 단서입니다.
    if (!code && error.stack) console.error(error.stack);
};

module.exports = { logError };
