/*
 * 입력값 검사 공용 모듈.
 *
 * 예전에는 받은 값을 그대로 INSERT 해서, 빈 제목도 70KB 짜리 댓글도 통과한 뒤
 * DB 제약에 가서야 죽었습니다. 사용자에게는 "서버 에러 발생" 만 보이고 서버
 * 로그에는 쿼리 전문이 통째로 찍혔습니다. 앞에서 걸러 400 으로 답합니다.
 *
 * 모든 함수는 문제가 있으면 { error }, 없으면 다듬은 { value } 를 돌려줍니다.
 */

/**
 * 받침에 맞는 조사를 붙입니다. '제목' + 을/를 → '제목을', '내용' → '내용을',
 * '평점' → '평점을', '품종' → '품종을', '이름' → '이름을'.
 * 받침을 보지 않고 한쪽으로 고정하면 "제목를 입력해주세요" 같은 문구가 나옵니다.
 */
const attach = (word, withFinal, withoutFinal) => {
    const last = word.charCodeAt(word.length - 1);
    // 한글 음절(가~힣)이 아니면 받침이 없는 쪽으로 둡니다.
    if (!(last >= 0xac00 && last <= 0xd7a3)) return word + withoutFinal;
    return word + ((last - 0xac00) % 28 !== 0 ? withFinal : withoutFinal);
};

const eul = (word) => attach(word, '을', '를');
const eun = (word) => attach(word, '은', '는');

/** 글자 수는 바이트가 아니라 문자 기준입니다. MySQL 의 varchar/text 도 문자 기준입니다. */
const textField = (raw, { label, max, required = true }) => {
    const value = String(raw ?? '').trim();

    if (!value) {
        return required ? { error: `${eul(label)} 입력해주세요.` } : { value: null };
    }
    if (value.length > max) {
        return { error: `${eun(label)} ${max}자까지 입력할 수 있습니다.` };
    }
    return { value };
};

const HTML_TAG = /<[^>]*>/g;

/**
 * 에디터 본문에 실제 내용이 있는지.
 *
 * ReactQuill 은 아무것도 안 쓴 상태를 빈 문자열이 아니라 `<p><br></p>` 로 보냅니다.
 * 그래서 `!content` 로는 빈 글이 걸러지지 않고, 제목만 있는 글이 그대로 등록됩니다.
 * 사진만 넣고 글자를 안 쓴 경우는 내용이 있는 것으로 봅니다.
 */
const richTextHasContent = (html) => {
    if (/<img\b/i.test(html)) return true;
    return (
        String(html)
            .replace(HTML_TAG, '')
            .replace(/&nbsp;/gi, ' ')
            .trim().length > 0
    );
};

/** 정수 범위. 화면이 숫자를 문자열로 보내는 경우가 있어 Number 로 맞춰 봅니다. */
const intField = (raw, { label, min, max, required = true }) => {
    if (raw === undefined || raw === null || raw === '') {
        return required ? { error: `${eul(label)} 입력해주세요.` } : { value: null };
    }

    const value = Number(raw);
    if (!Number.isInteger(value)) {
        return { error: `${eun(label)} 숫자여야 합니다.` };
    }
    if (value < min || value > max) {
        return { error: `${eun(label)} ${min}에서 ${max} 사이여야 합니다.` };
    }
    return { value };
};

/** 소수 범위. 몸무게처럼 정수가 아닐 수 있는 값에 씁니다. */
const decimalField = (raw, { label, min, max, required = true }) => {
    if (raw === undefined || raw === null || raw === '') {
        return required ? { error: `${eul(label)} 입력해주세요.` } : { value: null };
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
        return { error: `${eun(label)} 숫자여야 합니다.` };
    }
    if (value < min || value > max) {
        return { error: `${eun(label)} ${min}에서 ${max} 사이여야 합니다.` };
    }
    return { value };
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * YYYY-MM-DD 날짜. `future: false` 면 미래 날짜를 거부합니다.
 * 생일에 미래 날짜가 들어가면 홈의 나이 계산이 음수가 됩니다.
 */
/**
 * YYYY-MM-DD 날짜.
 *
 * @param {object} opts
 * @param {boolean} [opts.future] false 면 오늘 이후를 막습니다 (생일처럼 지난 날만 되는 값).
 * @param {string}  [opts.min] 이 날짜(YYYY-MM-DD)보다 앞서면 막습니다.
 * @param {string}  [opts.max] 이 날짜보다 뒤면 막습니다.
 *
 * min·max 는 ISO 문자열이라 사전순 비교가 곧 날짜순 비교입니다.
 */
const dateField = (raw, { label, required = true, future = true, min, max } = {}) => {
    if (raw === undefined || raw === null || raw === '') {
        return required ? { error: `${eul(label)} 입력해주세요.` } : { value: null };
    }

    const value = String(raw).trim();
    if (!DATE_RE.test(value)) {
        return { error: `${eun(label)} YYYY-MM-DD 형식이어야 합니다.` };
    }

    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return { error: `${eun(label)} 올바른 날짜가 아닙니다.` };
    }

    /*
     * 되돌려 보고 같은 날짜인지 확인합니다.
     *
     * 형식만 보면 2020-02-31 이 통과합니다. Date 는 그것을 3월 2일로 넘겨 버려서
     * 오류가 나지 않기 때문입니다. 그대로 두면 MySQL 의 STRICT 모드가 거부해
     * 사용자는 "서버 에러 발생" 만 보게 됩니다.
     */
    const [y, m, d] = value.split('-').map(Number);
    if (
        parsed.getFullYear() !== y ||
        parsed.getMonth() + 1 !== m ||
        parsed.getDate() !== d
    ) {
        return { error: `${eun(label)} 올바른 날짜가 아닙니다.` };
    }
    if (!future) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (parsed > today) return { error: `${eun(label)} 오늘 이후일 수 없습니다.` };
    }
    if (min && value < min) return { error: `${eun(label)} ${min} 이후여야 합니다.` };
    if (max && value > max) return { error: `${eun(label)} ${max} 이전이어야 합니다.` };
    return { value };
};

/**
 * 오늘에서 몇 해 떨어진 날을 YYYY-MM-DD 로.
 *
 * 값 자체가 상한·하한이라 하루 어긋나도 뜻이 달라지지 않습니다. 시간대를 따지지
 * 않고 그 기계의 달력을 그대로 씁니다.
 */
const yearsFromToday = (years) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/*
 * HH:MM. 브라우저의 <input type="time"> 이 보내는 모양입니다.
 * 초까지 오는 경우(HH:MM:SS)도 받아 앞 다섯 글자만 씁니다 — 분 단위면 충분하고,
 * 초를 그대로 두면 화면마다 '15:00' 과 '15:00:00' 이 섞입니다.
 */
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

/**
 * HH:MM 시각. 비워 두는 것이 정상인 값이라 기본은 required: false 입니다.
 *
 * 정규식만으로 거르고 Date 로 되돌려 보지 않습니다. 날짜와 달리 24:00 이나
 * 2월 31일 같은 "형식은 맞지만 없는 값" 이 시각에는 없습니다.
 */
const timeField = (raw, { label, required = false }) => {
    if (raw === undefined || raw === null || raw === '') {
        return required ? { error: `${eul(label)} 입력해주세요.` } : { value: null };
    }

    const value = String(raw).trim();
    if (!TIME_RE.test(value)) {
        return { error: `${eun(label)} HH:MM 형식이어야 합니다.` };
    }
    return { value: value.slice(0, 5) };
};

module.exports = {
    textField,
    intField,
    decimalField,
    dateField,
    timeField,
    yearsFromToday,
    richTextHasContent,
};
