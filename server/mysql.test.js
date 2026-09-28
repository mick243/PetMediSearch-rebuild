const test = require('node:test');
const assert = require('node:assert');
const pool = require('./mysql');

/*
 * 자리표시자에 객체가 와도 SQL 조건의 모양이 바뀌지 않는지 (mysql.js 의 stringifyObjects).
 * 이 설정이 빠지면 값 하나로 WHERE 가 바뀌고, 그 오류로 서버가 죽은 적이 있습니다.
 * 연결은 열지 않습니다 — format 은 문자열만 만듭니다.
 */

test.after(() => pool.end(() => {}));

test('객체 값은 문자열 하나로만 들어간다', () => {
    assert.strictEqual(
        pool.format('SELECT 1 FROM users WHERE social_id = ?', [{ social_id: 1 }]),
        "SELECT 1 FROM users WHERE social_id = '[object Object]'",
    );
});

test('평소에 쓰는 값은 그대로 들어간다', () => {
    assert.strictEqual(pool.format('SELECT ?', ['강아지']), "SELECT '강아지'");
    assert.strictEqual(pool.format('WHERE id IN (?)', [[1, 2, 3]]), 'WHERE id IN (1, 2, 3)');
    assert.strictEqual(pool.format('SELECT ?', [Buffer.from('ab')]), "SELECT X'6162'");
    assert.strictEqual(pool.format('SELECT ?', [null]), 'SELECT NULL');
});
