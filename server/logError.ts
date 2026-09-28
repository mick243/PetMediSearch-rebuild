/*
 * 서버 오류를 로그에 남깁니다.
 *
 * 예전에는 console.error(err) 로 오류 객체를 통째로 찍었습니다. mysql2 의 오류는
 * 실행하려던 쿼리 전문(err.sql)을 들고 있어서, 사진이 붙은 글 하나가 실패하면
 * 100KB 짜리 base64 가 로그에 그대로 남았습니다. 글 본문·이메일·전화번호처럼
 * 값으로 들어간 개인정보도 같이 남습니다.
 *
 * Prisma 오류도 같습니다. PrismaClientValidationError 의 message 에는 넘긴 인자가 값째로
 * 들어 있고, 드라이버 오류의 meta 에는 중복된 키 값(이메일)이 들어올 수 있습니다.
 *
 * 원인을 찾는 데 필요한 것은 오류 코드와 문구이지 쿼리 본문이 아닙니다.
 * 어떤 쿼리였는지는 코드와 맥락으로 찾을 수 있습니다.
 */

/** 오류에서 읽는 칸. mysql2 · Prisma · axios · 보통 Error 가 각자 일부만 갖고 있습니다. */
interface LoggableError {
    code?: string;
    errno?: number;
    sqlState?: string;
    sqlMessage?: string;
    message?: string;
    name?: string;
    stack?: string;
    meta?: { modelName?: unknown; target?: unknown; constraint?: unknown } | null;
}

/** Prisma 의 meta 에서 값이 아니라 이름만 골라 씁니다(모델 · 필드 · 제약). */
const describeMeta = (meta: LoggableError['meta']) => {
    if (!meta || typeof meta !== 'object') return '';
    const parts: string[] = [];
    if (typeof meta.modelName === 'string') parts.push(meta.modelName);
    for (const key of ['target', 'constraint'] as const) {
        const value = meta[key];
        if (typeof value === 'string') parts.push(`${key}=${value}`);
        else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) parts.push(`${key}=${value.join(',')}`);
        else if (value && typeof value === 'object' && 'fields' in value && Array.isArray(value.fields)) {
            parts.push(`${key}=${value.fields.filter((v) => typeof v === 'string').join(',')}`);
        }
    }
    return parts.length ? ` (${parts.join(', ')})` : '';
};

const logError = (context: string, error: unknown) => {
    if (!error || typeof error !== 'object') {
        console.error(`[${context}]`, error);
        return;
    }

    const { code, errno, sqlState, sqlMessage, message, name, stack, meta } = error as LoggableError;

    if (errno || sqlState) {
        // mysql2 오류. sqlMessage 에 어느 컬럼이 문제인지까지 들어 있습니다.
        console.error(`[${context}] ${code} (errno ${errno}, ${sqlState}): ${sqlMessage || message}`);
        return;
    }

    if (name?.startsWith('PrismaClient')) {
        /*
         * Prisma 오류. message 는 찍지 않습니다 — 요청 인자(글 본문 · 이메일 · 사진)가 그대로
         * 들어 있고, 드라이버가 낸 문구에는 중복된 값이 들어 있습니다. 코드(P2002 · P2003 …)와
         * 모델 · 필드 이름이면 어느 자리인지 찾기에 충분합니다.
         */
        console.error(`[${context}] ${name}${code ? ` ${code}` : ''}${describeMeta(meta)}`);
        return;
    }

    /*
     * 그 밖의 오류. axios 오류처럼 code 만 있는 것도 여기로 옵니다.
     * axios 오류를 통째로 찍으면 요청 config 가 딸려 나와 client_secret 까지 로그에 남습니다.
     */
    console.error(`[${context}] ${code || name || 'Error'}: ${message}`);

    // 코드가 없는 순수 자바스크립트 오류만 스택을 남깁니다. 어디서 났는지가 유일한 단서입니다.
    if (!code && stack) console.error(stack);
};

export { logError };
