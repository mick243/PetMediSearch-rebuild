const test = require('node:test');
const assert = require('node:assert/strict');

const {
    expandKeyword,
    escapeLike,
    tokenize,
    loosePattern,
    keywordClause,
    keywordScoreExpr,
} = require('./search');

/*
 * 시설 검색 규칙.
 *
 * 이 부분은 "춘천 소망병원" 으로 "강원특별자치도 춘천시 영서로 2293 ·
 * 소망동물병원" 을 찾아야 한다는 요구에서 나왔고, 규칙이 눈으로 읽어서는
 * 맞는지 알기 어렵습니다. 특히 느슨한 패턴을 어디까지 열어 줄지가 미묘합니다.
 */

test('escapeLike: LIKE 의 와일드카드를 글자 그대로 찾게 막는다', () => {
    // 이게 없으면 검색어에 % 를 넣어 전체 조회를 끌어낼 수 있습니다.
    assert.equal(escapeLike('100%'), '100\\%');
    assert.equal(escapeLike('a_b'), 'a\\_b');
    assert.equal(escapeLike('back\\slash'), 'back\\\\slash');
    assert.equal(escapeLike('멀쩡한 이름'), '멀쩡한 이름');
});

test('tokenize: 공백으로 나누고 빈 조각은 버린다', () => {
    assert.deepEqual(tokenize('춘천 소망병원'), ['춘천', '소망병원']);
    assert.deepEqual(tokenize('  춘천   소망병원  '), ['춘천', '소망병원']);
    assert.deepEqual(tokenize('   '), []);
});

test('loosePattern: 글자 사이를 벌려 중간 낱말이 빠진 상호를 잡는다', () => {
    // "소망병원" 으로 "소망동물병원" 을 찾기 위한 것입니다.
    assert.equal(loosePattern('소망병원'), '%소%망%병%원%');
});

test('loosePattern: 한 글자는 만들지 않는다', () => {
    // 한 글자짜리는 %가% 가 되어 그냥 부분 문자열과 같아집니다.
    // 모든 이름에 걸려 검색이 무의미해집니다.
    assert.equal(loosePattern('가'), null);
    assert.equal(loosePattern(''), null);
});

test('loosePattern: 벌린 글자에도 와일드카드 이스케이프가 적용된다', () => {
    assert.equal(loosePattern('a%b'), '%a%\\%%b%');
});

test('expandKeyword: 사람들이 쓰는 지역명을 저장된 표기로 넓힌다', () => {
    // 주소는 공공데이터 원본 표기로 저장돼 있어 "세종시" 로는 안 걸립니다.
    assert.deepEqual(expandKeyword('세종시'), ['세종시', '세종특별자치시']);
    assert.deepEqual(expandKeyword('강원도'), ['강원도', '강원특별자치도']);
    // 별칭이 없으면 원본만
    assert.deepEqual(expandKeyword('춘천'), ['춘천']);
});

test('keywordClause: 토큰을 모두 만족해야 한다 (AND)', () => {
    const values = [];
    const clause = keywordClause('춘천 소망병원', values);

    // 두 토큰이 AND 로 묶입니다.
    assert.match(clause, /^ AND \(.+\) AND \(.+\)$/);
    // 값이 하나도 빠지지 않고 자리표시자와 수가 맞아야 합니다.
    assert.equal((clause.match(/\?/g) || []).length, values.length);
});

test('keywordClause: 느슨한 패턴은 상호에만 건다', () => {
    const values = [];
    keywordClause('소망병원', values);

    const loose = values.filter((v) => v === '%소%망%병%원%');
    assert.equal(loose.length, 1, '느슨한 패턴은 딱 한 번(상호)만 쓰여야 합니다');
});

test('keywordClause: 주소 칸에는 느슨한 패턴이 들어가지 않는다', () => {
    /*
     * 주소까지 열어 주면 "강원" 이 "강...원" 으로 엉뚱한 곳에 붙습니다.
     * 절에서 주소 칸과 느슨한 패턴이 같은 OR 갈래에 있지 않은지 봅니다.
     */
    const values = [];
    const clause = keywordClause('소망병원', values);

    // 느슨한 패턴 조건은 bplcnm 에만 붙습니다.
    assert.match(clause, /bplcnm LIKE \?\)$|bplcnm LIKE \?\)/);
    assert.doesNotMatch(clause, /rdnwhladdr LIKE \? OR bplcnm LIKE \?\)/);
});

test('keywordClause: 검색어가 없으면 조건을 만들지 않는다', () => {
    const values = [];
    assert.equal(keywordClause('   ', values), '');
    assert.equal(values.length, 0);
});

test('keywordScoreExpr: 상호에 그대로 맞는 쪽에 더 큰 점수를 준다', () => {
    const values = [];
    const expr = keywordScoreExpr('소망병원', values);

    // 상호 3점 · 느슨 2점 · 주소 1점
    assert.match(expr, /bplcnm LIKE \?\) \* 3/);
    assert.match(expr, /bplcnm LIKE \?\) \* 2/);
    assert.match(expr, /rdnwhladdr LIKE \?\)/);
    assert.equal((expr.match(/\?/g) || []).length, values.length);
});

test('keywordScoreExpr: 한 글자 토큰은 느슨한 항이 빠진다', () => {
    const values = [];
    const expr = keywordScoreExpr('가', values);

    assert.doesNotMatch(expr, /\* 2/);
    assert.equal((expr.match(/\?/g) || []).length, values.length);
});

test('keywordScoreExpr: 검색어가 없으면 null', () => {
    assert.equal(keywordScoreExpr('  ', []), null);
});
