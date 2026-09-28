const test = require('node:test');
const assert = require('node:assert/strict');

const {
    textField,
    intField,
    idField,
    decimalField,
    dateField,
    yearsFromToday,
    timeField,
    richTextHasContent,
    isImageDataUrl,
} = require('./validate');

/*
 * 입력 검증.
 *
 * 여기가 뚫리면 DB 제약에 가서야 500 으로 죽습니다. 사용자는 "서버 에러 발생"
 * 만 보고, 서버 로그에는 쿼리 전문이 남습니다.
 */

test('textField: 앞뒤 공백을 털어낸다', () => {
    assert.deepEqual(textField('  안녕  ', { label: '제목', max: 10 }), {
        value: '안녕',
    });
});

test('textField: 공백만 있으면 빈 값으로 본다', () => {
    // trim 하지 않고 보면 "   " 이 제목으로 등록됩니다.
    const { error } = textField('   ', { label: '제목', max: 10 });
    assert.equal(error, '제목을 입력해주세요.');
});

test('textField: 길이 상한', () => {
    const { error } = textField('가'.repeat(11), { label: '댓글', max: 10 });
    assert.equal(error, '댓글은 10자까지 입력할 수 있습니다.');
});

test('textField: 선택 항목은 비어도 통과하고 null 이 된다', () => {
    assert.deepEqual(
        textField('', { label: '품종', max: 50, required: false }),
        { value: null }
    );
});

test('textField: undefined 와 null 도 빈 값으로 다룬다', () => {
    assert.ok(textField(undefined, { label: '제목', max: 10 }).error);
    assert.ok(textField(null, { label: '제목', max: 10 }).error);
});

/*
 * 조사는 받침을 보고 골라야 합니다. 한쪽으로 고정하면
 * "제목를 입력해주세요" 같은 문구가 사용자에게 그대로 나갑니다.
 */
test('조사: 받침이 있으면 을/은', () => {
    assert.equal(
        textField('', { label: '제목', max: 5 }).error,
        '제목을 입력해주세요.'
    );
    assert.equal(
        textField('가'.repeat(6), { label: '제목', max: 5 }).error,
        '제목은 5자까지 입력할 수 있습니다.'
    );
});

test('조사: 받침이 없으면 를/는', () => {
    assert.equal(
        textField('', { label: '주소', max: 5 }).error,
        '주소를 입력해주세요.'
    );
    assert.equal(
        textField('가'.repeat(6), { label: '주소', max: 5 }).error,
        '주소는 5자까지 입력할 수 있습니다.'
    );
});

test('조사: 한글이 아닌 이름은 받침 없는 쪽으로 둔다', () => {
    assert.equal(
        textField('', { label: 'email', max: 5 }).error,
        'email를 입력해주세요.'
    );
});

test('intField: 범위 안', () => {
    assert.deepEqual(intField(3, { label: '평점', min: 1, max: 5 }), { value: 3 });
});

test('intField: 화면이 문자열로 보내도 받는다', () => {
    assert.deepEqual(intField('4', { label: '평점', min: 1, max: 5 }), { value: 4 });
});

test('intField: 범위 밖', () => {
    assert.equal(
        intField(9, { label: '평점', min: 1, max: 5 }).error,
        '평점은 1에서 5 사이여야 합니다.'
    );
    assert.ok(intField(0, { label: '평점', min: 1, max: 5 }).error);
});

test('intField: 정수가 아니면 거부', () => {
    assert.ok(intField(3.5, { label: '평점', min: 1, max: 5 }).error);
    assert.ok(intField('셋', { label: '평점', min: 1, max: 5 }).error);
});

test('decimalField: 소수를 받는다', () => {
    assert.deepEqual(
        decimalField(4.25, { label: '몸무게', min: 0, max: 200 }),
        { value: 4.25 }
    );
});

test('decimalField: 범위 밖', () => {
    assert.equal(
        decimalField(9999, { label: '몸무게', min: 0, max: 200 }).error,
        '몸무게는 0에서 200 사이여야 합니다.'
    );
});

test('dateField: YYYY-MM-DD 만 받는다', () => {
    assert.deepEqual(dateField('2020-03-15', { label: '생일' }), {
        value: '2020-03-15',
    });
    assert.ok(dateField('2020/03/15', { label: '생일' }).error);
    assert.ok(dateField('20200315', { label: '생일' }).error);
});

test('dateField: 없는 날짜는 거부', () => {
    assert.ok(dateField('2020-02-31', { label: '생일' }).error);
});

test('dateField: future:false 면 미래 날짜를 거부한다', () => {
    // 생일이 미래면 홈의 나이 계산이 음수가 됩니다.
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const future = next.toISOString().slice(0, 10);

    assert.equal(
        dateField(future, { label: '생일', future: false }).error,
        '생일은 오늘 이후일 수 없습니다.'
    );
});

test('dateField: 오늘은 미래가 아니다', () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');

    assert.deepEqual(
        dateField(`${y}-${m}-${d}`, { label: '생일', future: false }),
        { value: `${y}-${m}-${d}` }
    );
});

test('dateField: 접종 일정은 미래를 허용한다', () => {
    assert.deepEqual(dateField('2099-01-01', { label: '날짜' }), {
        value: '2099-01-01',
    });
});

/*
 * 에디터(ReactQuill)는 아무것도 안 쓴 상태를 빈 문자열이 아니라
 * `<p><br></p>` 로 보냅니다. !content 로는 걸러지지 않습니다.
 */
test('richTextHasContent: 에디터의 빈 본문을 걸러낸다', () => {
    assert.equal(richTextHasContent('<p><br></p>'), false);
    assert.equal(richTextHasContent('<p></p>'), false);
    assert.equal(richTextHasContent('<p>&nbsp;</p>'), false);
    assert.equal(richTextHasContent('   '), false);
});

test('richTextHasContent: 글자가 있으면 통과', () => {
    assert.equal(richTextHasContent('<p>안녕하세요</p>'), true);
});

test('richTextHasContent: 글자가 없어도 사진이 있으면 통과', () => {
    // 사진만 올리고 글을 안 쓰는 것은 정상적인 사용입니다.
    assert.equal(
        richTextHasContent('<p><img src="data:image/jpeg;base64,AAA"></p>'),
        true
    );
    assert.equal(richTextHasContent('<IMG SRC="x">'), true);
});

/*
 * 시각.
 *
 * 비어 있는 것이 정상인 값이라, "안 넣음" 과 "잘못 넣음" 을 가르는 것이 핵심입니다.
 * 둘을 뭉치면 시각을 지우려는 사용자가 오류 문구만 보게 됩니다.
 */

test('timeField: 비워 두면 null (오류가 아니다)', () => {
    assert.deepEqual(timeField('', { label: '시각' }), { value: null });
    assert.deepEqual(timeField(null, { label: '시각' }), { value: null });
    assert.deepEqual(timeField(undefined, { label: '시각' }), { value: null });
});

test('timeField: HH:MM 을 그대로 받는다', () => {
    assert.deepEqual(timeField('09:05', { label: '시각' }), { value: '09:05' });
    assert.deepEqual(timeField('00:00', { label: '시각' }), { value: '00:00' });
    assert.deepEqual(timeField('23:59', { label: '시각' }), { value: '23:59' });
});

test('timeField: 초가 붙어 와도 분까지만 남긴다', () => {
    // DB 의 TIME 은 'HH:MM:SS' 로 돌아옵니다. 그대로 두면 화면마다 형식이 섞입니다.
    assert.deepEqual(timeField('15:30:00', { label: '시각' }), { value: '15:30' });
});

test('timeField: 없는 시각은 거부한다', () => {
    assert.ok(timeField('24:00', { label: '시각' }).error);
    assert.ok(timeField('25:99', { label: '시각' }).error);
    assert.ok(timeField('9:05', { label: '시각' }).error);
    assert.ok(timeField('오후 3시', { label: '시각' }).error);
});

test('timeField: required 면 빈 값을 막는다', () => {
    assert.ok(timeField('', { label: '시각', required: true }).error);
});

/*
 * 접종 일정은 지난 날도 받아야 합니다(놓친 일정, 이미 맞힌 기록). 다만 범위가 없으면
 * 1900-01-01 짜리가 등록되고, 홈의 D-day 타일이 "D+46000" 같은 수를 보여 줍니다.
 */
test('dateField: min·max 로 범위를 끊는다', () => {
    const opts = { label: '날짜', min: '2020-01-01', max: '2030-12-31' };
    assert.deepEqual(dateField('2025-06-01', opts), { value: '2025-06-01' });
    // 경계는 통과합니다.
    assert.deepEqual(dateField('2020-01-01', opts), { value: '2020-01-01' });
    assert.deepEqual(dateField('2030-12-31', opts), { value: '2030-12-31' });
    assert.ok(dateField('2019-12-31', opts).error);
    assert.ok(dateField('2031-01-01', opts).error);
});

test('dateField: min·max 를 안 주면 범위를 보지 않는다', () => {
    assert.deepEqual(dateField('1900-01-01', { label: '날짜' }), { value: '1900-01-01' });
});

test('yearsFromToday: YYYY-MM-DD 로 돌려준다', () => {
    const now = new Date().getFullYear();
    assert.match(yearsFromToday(0), /^\d{4}-\d{2}-\d{2}$/);
    assert.strictEqual(Number(yearsFromToday(-30).slice(0, 4)), now - 30);
    assert.strictEqual(Number(yearsFromToday(30).slice(0, 4)), now + 30);
});

test('idField: 숫자와 숫자만 든 문자열을 번호로 받는다', () => {
    assert.deepEqual(idField(12, { label: '글' }), { value: 12 });
    assert.deepEqual(idField('12', { label: '글' }), { value: 12 });
    assert.deepEqual(idField(2147483647, { label: '글' }), { value: 2147483647 });
});

test('idField: 숫자처럼 보이기만 하는 값은 번호로 받지 않는다', () => {
    // Number() 에 맡기면 [5] 는 5, true 는 1, '1e3' 은 1000 이 되어 엉뚱한 번호로 통과합니다.
    const notIds = [[5], { id: 5 }, true, '1e3', ' 5', '5abc', '0x10', 1.5, 0, -3, '2147483648'];
    for (const raw of notIds) {
        assert.equal(idField(raw, { label: '글' }).error, '글 번호가 올바르지 않습니다.', JSON.stringify(raw));
    }
});

test('idField: 비어 있으면 필수는 오류, 선택은 null', () => {
    assert.equal(idField(undefined, { label: '시설' }).error, '어느 시설인지 알 수 없습니다.');
    assert.deepEqual(idField(null, { label: '원댓글', required: false }), { value: null });
    assert.deepEqual(idField('', { label: '분류', required: false }), { value: null });
});

test('isImageDataUrl: 줄인 JPEG · PNG · WebP data URL 만 사진으로 받는다', () => {
    assert.equal(isImageDataUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), true);
    assert.equal(isImageDataUrl('data:image/png;base64,iVBORw0KGgo='), true);
    assert.equal(isImageDataUrl('data:image/webp;base64,UklGRg=='), true);

    // svg 는 스크립트가 들어가고, data URL 이 아닌 값은 보는 사람의 브라우저가 대신 불러 줍니다.
    assert.equal(isImageDataUrl('data:image/svg+xml;base64,PHN2Zz4='), false);
    assert.equal(isImageDataUrl('not-a-photo'), false);
    assert.equal(isImageDataUrl(['data:image/jpeg;base64,AAAA']), false);
});

test('isImageDataUrl: 2MB 를 넘으면 받지 않는다', () => {
    const head = 'data:image/jpeg;base64,';
    assert.equal(isImageDataUrl(head + 'A'.repeat(2 * 1024 * 1024 - head.length)), true);
    assert.equal(isImageDataUrl(head + 'A'.repeat(2 * 1024 * 1024)), false);
});
