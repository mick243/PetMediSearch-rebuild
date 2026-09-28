import test from 'node:test';
import assert from 'node:assert';
import mysql from 'mysql2';
import { statements, checkSettings } from './createDbUser.js';

/*
 * 앱 계정의 권한 목록을 못박습니다(scripts/createDbUser.ts).
 * 넓혀도 앱은 그대로 돌아서 눈으로는 알 수 없는 자리입니다. 연결은 열지 않습니다.
 */

const settings = { user: 'petmedisearch_app', password: 'x'.repeat(24), database: 'petmedisearch' };
const rendered = () => statements(settings).map(([sql, values]) => mysql.format(sql, values));

test('앱 계정은 자기 DB 의 행 읽기·쓰기와 emoticons 의 ALTER 만 받는다', () => {
    const grants = rendered().filter((sql) => sql.startsWith('GRANT'));

    assert.deepStrictEqual(grants, [
        "GRANT SELECT, INSERT, UPDATE, DELETE ON `petmedisearch`.* TO 'petmedisearch_app'@'%'",
        "GRANT ALTER ON `petmedisearch`.`emoticons` TO 'petmedisearch_app'@'%'",
    ]);
});

test('다시 돌리면 예전에 준 넓은 권한부터 걷어낸다', () => {
    const sqls = rendered();
    const revoke = sqls.findIndex((sql) => sql.startsWith('REVOKE ALL PRIVILEGES, GRANT OPTION'));

    assert.ok(revoke >= 0);
    assert.ok(revoke < sqls.findIndex((sql) => sql.startsWith('GRANT')));
});

test('root 로 두거나 짧은 암호면 돌지 않는다', () => {
    const ok = { ...settings, rootPassword: 'r' };

    assert.strictEqual(checkSettings(ok), null);
    // 문구가 나와야 하는 자리입니다. null 이 오면 assert.match 가 그대로 실패합니다.
    assert.match(checkSettings({ ...ok, user: 'root' }) as string, /root/);
    assert.match(checkSettings({ ...ok, password: 'password' }) as string, /16자/);
    assert.match(checkSettings({ ...ok, rootPassword: '' }) as string, /DB_ROOT_PASSWORD/);
});
