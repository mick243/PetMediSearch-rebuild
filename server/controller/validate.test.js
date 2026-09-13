const test = require('node:test');
const assert = require('node:assert/strict');

const {
    textField,
    intField,
    decimalField,
    dateField,
    richTextHasContent,
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
