const jwt = require('jsonwebtoken');

const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error('Invalid token:', error.name, ', ', error.message);
        return null;
    }
};

/**
 * 요청자가 관리자인지. 값으로 user_id 를 하나 넘깁니다.
 *
 * 토큰에도 role 이 실려 있지만 굳이 users 를 다시 보는 이유는, 토큰이 하루짜리라
 * 권한을 거둬들여도 남아 있는 토큰으로 계속 지울 수 있으면 안 되기 때문입니다.
 * 삭제는 자주 일어나지 않아서 조회가 한 번 더 붙어도 부담이 없습니다.
 */
const IS_ADMIN = "(SELECT role FROM users WHERE user_id = ?) = 'admin'";

/**
 * 삭제 권한 조건. 삭제 쿼리의 WHERE 절에 붙여 씁니다.
 * 작성자 본인이거나 관리자면 통과합니다. 값은 [user_id, user_id] 순서로 넘깁니다.
 */
const OWNER_OR_ADMIN = `(user_id = ? OR ${IS_ADMIN})`;

module.exports = { verifyToken, IS_ADMIN, OWNER_OR_ADMIN }
