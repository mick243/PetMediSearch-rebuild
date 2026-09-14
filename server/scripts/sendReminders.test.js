const test = require('node:test');
const assert = require('node:assert');

const { parseDays, addDays, maskEmail, maskPhone } = require('./sendReminders');

/*
 * 여기 있는 것들은 전부 조용히 틀리는 자리입니다.
 *
 *   - 날짜 더하기가 하루 밀리면 알림이 통째로 하루 어긋나는데, 화면에는 아무 표시도
 *     나지 않습니다. 월말·연말·윤년에서 특히 그렇습니다.
 *   - 마스킹이 뚫리면 터미널 기록과 cron 메일에 연락처가 그대로 남습니다.
 */

test('parseDays: 값이 없으면 기본값 3·2·1', () => {
  assert.deepStrictEqual(parseDays(null), [3, 2, 1]);
  assert.deepStrictEqual(parseDays(undefined), [3, 2, 1]);
});

test('parseDays: 먼 날부터 정렬하고 중복은 없앤다', () => {
  assert.deepStrictEqual(parseDays('1,2,3'), [3, 2, 1]);
  assert.deepStrictEqual(parseDays(' 2 , 7 , 2 '), [7, 2]);
  assert.deepStrictEqual(parseDays('0'), [0]);
});

test('parseDays: 숫자가 아니거나 상한을 넘으면 오류', () => {
  assert.throws(() => parseDays(''), /값이 없습니다/);
  assert.throws(() => parseDays('사흘'), /정수만/);
  assert.throws(() => parseDays('3,-1'), /정수만/);
  assert.throws(() => parseDays('366'), /365 이하/);
});

test('addDays: 월·연·윤년 경계를 넘어간다', () => {
  assert.strictEqual(addDays('2026-09-14', 3), '2026-09-17');
  assert.strictEqual(addDays('2026-09-30', 1), '2026-10-01');
  assert.strictEqual(addDays('2026-12-31', 1), '2027-01-01');
  // 2028 은 윤년이라 2월이 29일까지 있습니다.
  assert.strictEqual(addDays('2028-02-28', 1), '2028-02-29');
  assert.strictEqual(addDays('2027-02-28', 1), '2027-03-01');
  assert.strictEqual(addDays('2026-09-14', 0), '2026-09-14');
});

test('addDays: 기계의 시간대에 흔들리지 않는다', () => {
  const before = process.env.TZ;
  try {
    // 한국(UTC+9)과 하와이(UTC-10). Date 를 그대로 쓰면 여기서 하루가 갈립니다.
    process.env.TZ = 'Asia/Seoul';
    const seoul = addDays('2026-09-14', 3);
    process.env.TZ = 'Pacific/Honolulu';
    const honolulu = addDays('2026-09-14', 3);
    assert.strictEqual(seoul, honolulu);
    assert.strictEqual(seoul, '2026-09-17');
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});

test('addDays: 날짜 모양이 아니면 오류', () => {
  assert.throws(() => addDays('2026-9-14', 1), /YYYY-MM-DD/);
  assert.throws(() => addDays('', 1), /YYYY-MM-DD/);
});

test('maskEmail: 첫 글자와 도메인만 남긴다', () => {
  assert.strictEqual(maskEmail('hong@example.com'), 'h***@example.com');
  assert.strictEqual(maskEmail('a@b.com'), 'a***@b.com');
});

test('maskEmail: 형식이 아니면 통째로 가린다', () => {
  assert.strictEqual(maskEmail('@example.com'), '***');
  assert.strictEqual(maskEmail('주소아님'), '***');
  assert.strictEqual(maskEmail(null), '***');
  assert.strictEqual(maskEmail(undefined), '***');
});

test('maskPhone: 앞 3자리와 뒤 4자리만 남긴다', () => {
  assert.strictEqual(maskPhone('01099998888'), '010****8888');
  assert.strictEqual(maskPhone('010-9999-8888'), '010****8888');
  assert.strictEqual(maskPhone('0212345678'), '021****5678');
});

test('maskPhone: 너무 짧으면 통째로 가린다', () => {
  assert.strictEqual(maskPhone('123456'), '***');
  assert.strictEqual(maskPhone(''), '***');
  assert.strictEqual(maskPhone(null), '***');
});
