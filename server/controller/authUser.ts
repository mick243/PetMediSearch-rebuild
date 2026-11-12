import jwt from 'jsonwebtoken';

/** 로그인 토큰에 싣는 값 (controller/auth.ts 의 generateToken). */
export interface TokenPayload {
    id: number;
    role: string;
    /** users.token_version. 예전 토큰에는 없습니다. */
    v?: number;
}

const verifyToken = (token: string | undefined): TokenPayload | null => {
    try {
        // 키나 토큰이 비면 jwt.verify 가 던지고, 아래에서 null 이 됩니다(예전과 같음).
        const decoded = jwt.verify(token ?? '', process.env.JWT_SECRET ?? '');
        // 이 서버는 객체만 싣습니다. 문자열 토큰은 우리가 만든 것이 아닙니다.
        return typeof decoded === 'string' ? null : (decoded as TokenPayload);
    } catch (error) {
        const { name, message } = error as Error;
        console.error('Invalid token:', name, ', ', message);
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

export { verifyToken, IS_ADMIN, OWNER_OR_ADMIN };
