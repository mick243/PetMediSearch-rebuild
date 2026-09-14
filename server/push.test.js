const test = require('node:test');
const assert = require('node:assert');

const { reminderPayload } = require('./push');

/*
 * 알림 문구는 잠금화면에 그대로 뜹니다. 한 번 나가면 고칠 수 없어서,
 * 하루 전만 "내일" 로 읽히는지 같은 것을 여기서 고정해 둡니다.
 */

test('reminderPayload: 제목에 아이 이름이 먼저 온다', () => {
  const payload = reminderPayload({
    petName: '짱구',
    scheduleName: '광견병 접종',
    daysLeft: 3,
    dueDate: '2026-09-17',
  });
  assert.strictEqual(payload.title, '짱구 광견병 접종 D-3');
  assert.strictEqual(payload.body, '3일 뒤 2026-09-17 예정이에요.');
});

test('reminderPayload: 하루 전은 "내일" 로 읽힌다', () => {
  const payload = reminderPayload({
    petName: '나비',
    scheduleName: '건강검진',
    daysLeft: 1,
    dueDate: '2026-09-15',
  });
  assert.strictEqual(payload.title, '나비 건강검진 D-1');
  assert.strictEqual(payload.body, '내일(2026-09-15) 예정이에요.');
});

test('reminderPayload: 누르면 일정 목록으로 간다', () => {
  const payload = reminderPayload({
    petName: '햄찌',
    scheduleName: '정기검진',
    daysLeft: 2,
    dueDate: '2026-09-16',
  });
  assert.strictEqual(payload.url, '/vaccinations');
});
