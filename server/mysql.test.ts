import test from 'node:test';
import assert from 'node:assert';
import type { Connection } from 'mysql2';
import mysqlPool from './mysql.js';

/*
 * 자리표시자에 객체가 와도 SQL 조건의 모양이 바뀌지 않는지 (mysql.ts 의 stringifyObjects).
 * 이 설정이 빠지면 값 하나로 WHERE 가 바뀌고, 그 오류로 서버가 죽은 적이 있습니다.
 * 연결은 열지 않습니다 — format 은 문자열만 만듭니다.
 */

/**
 * mysql2 의 타입에는 Pool.format 이 빠져 있습니다. 실제 풀(mysql2 의 lib/pool.js)에는 있고,
 * 풀을 만들 때 준 연결 설정(stringifyObjects)을 따라 문자열을 만듭니다.
 */
const pool = mysqlPool as typeof mysqlPool & Pick<Connection, 'format'>;

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
