/**
 * 접종·검진 알림을 보냅니다. 마감 3·2·1일 전에 웹 푸시로 나갑니다.
 *
 * 하루 한 번 도는 배치입니다. 보낸 것은 vaccination_reminders 에 적어 두어
 * 같은 날 두 번 돌아도(배포·재시작·손으로 재실행) 같은 알림이 두 번 가지 않습니다.
 *
 * 사용법:
 *   node scripts/sendReminders.js --dry-run              누구에게 갈지만 봅니다 (아무것도 보내지 않음)
 *   node scripts/sendReminders.js --send                 실제로 보냅니다
 *   node scripts/sendReminders.js --dry-run --days=7,3,1
 *   node scripts/sendReminders.js --dry-run --date=2026-10-01   오늘을 다른 날로 놓고 확인
 *   node scripts/sendReminders.js --dry-run --summary-only      건수만
 *
 * --send 를 일부러 필수로 뒀습니다. 아무 인자 없이 실행하면 알림이 나가는 쪽이
 * 기본값이면, 확인하려고 한 번 돌린 것이 그대로 발송이 됩니다.
 *
 * 출력에는 반려동물 이름과 보호자 이름이 들어갑니다. 연락처는 가려서 찍지만
 * 이름은 그대로라, 공용 로그나 이슈에 그대로 붙이지 마세요. 건수만 필요하면
 * --summary-only 를 쓰세요.
 *
 * 푸시가 닿지 않는 사람(알림을 켜지 않았거나 아이폰을 사파리 탭으로 쓰는 경우)은
 * 출력에 "구독 없음" 으로 나옵니다. 그 사람들에게는 아무것도 나가지 않습니다.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const { send, reminderPayload, isConfigured } = require('../push');

/** 기본 알림 시점. 마감 며칠 전인지. */
const DEFAULT_DAYS = [3, 2, 1];

/** 너무 먼 날짜를 받으면 표를 통째로 훑게 되므로 상한을 둡니다. */
const MAX_DAYS_BEFORE = 365;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "3,2,1" → [3, 2, 1]. 큰 수(먼 날)부터 정렬하고 중복은 없앱니다.
 * 값을 주지 않으면 기본값입니다. 빈 문자열은 실수로 보고 오류를 냅니다.
 */
const parseDays = (raw) => {
  if (raw === null || raw === undefined) return [...DEFAULT_DAYS];

  const parts = String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');

  if (parts.length === 0) {
    throw new Error('--days 에 값이 없습니다. 예) --days=3,2,1');
  }

  const days = parts.map((part) => {
    if (!/^\d+$/.test(part)) {
      throw new Error(`--days 는 0 이상의 정수만 받습니다: '${part}'`);
    }
    const value = Number(part);
    if (value > MAX_DAYS_BEFORE) {
      throw new Error(`--days 는 ${MAX_DAYS_BEFORE} 이하여야 합니다: '${part}'`);
    }
    return value;
  });

  return [...new Set(days)].sort((a, b) => b - a);
};

/**
 * 'YYYY-MM-DD' 에 며칠을 더합니다.
 *
 * Date 를 그냥 쓰면 실행하는 기계의 시간대에 따라 하루가 밀립니다. 이 값은
 * DATE 컬럼과 직접 비교하는 값이라 하루가 밀리면 알림이 통째로 하루 어긋납니다.
 * UTC 로만 계산해 시간대를 아예 끼어들지 못하게 합니다.
 */
const addDays = (isoDate, days) => {
  if (!ISO_DATE.test(isoDate)) {
    throw new Error(`날짜는 YYYY-MM-DD 모양이어야 합니다: '${isoDate}'`);
  }
  const [year, month, day] = isoDate.split('-').map(Number);
  const moved = new Date(Date.UTC(year, month - 1, day) + days * 86400000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`;
};

/**
 * 연락처는 가려서 찍습니다.
 *
 * 이 스크립트의 출력은 터미널 기록과 cron 메일에 그대로 남습니다. 대상이 맞는지
 * 보려면 "이 사람에게 보낼 수단이 있다" 는 것만 알면 되고, 주소 전체는 필요 없습니다.
 * 형식이 아니면 통째로 가립니다 — 어중간하게 드러내는 것보다 낫습니다.
 */
const maskEmail = (email) => {
  const value = String(email ?? '');
  const at = value.indexOf('@');
  if (at < 1) return '***';
  return `${value[0]}***${value.slice(at)}`;
};

const maskPhone = (phone) => {
  const digits = String(phone ?? '').replace(/[^0-9]/g, '');
  if (digits.length < 7) return '***';
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
};

/** 보낼 수 있는 수단을 사람이 읽는 문구로. */
const contactLabel = (row) => {
  const ways = [];
  if (row.email) ways.push(`메일 ${maskEmail(row.email)}`);
  if (row.phone) ways.push(`전화 ${maskPhone(row.phone)}`);
  if (ways.length === 0) {
    return row.social_type ? `연락처 없음(${row.social_type})` : '연락처 없음';
  }
  return ways.join(' · ');
};

const readArgs = (argv) => {
  const valueOf = (name) => {
    const prefix = `--${name}=`;
    const hit = argv.find((arg) => arg.startsWith(prefix));
    return hit === undefined ? null : hit.slice(prefix.length);
  };
  return {
    dryRun: argv.includes('--dry-run'),
    send: argv.includes('--send'),
    summaryOnly: argv.includes('--summary-only'),
    days: valueOf('days'),
    date: valueOf('date'),
  };
};

async function main() {
  const args = readArgs(process.argv.slice(2));

  if (args.dryRun === args.send) {
    console.error('--dry-run 이나 --send 중 하나를 주세요.');
    console.error('  확인만) node scripts/sendReminders.js --dry-run');
    console.error('  발송)   node scripts/sendReminders.js --send');
    process.exit(1);
  }
  if (args.send && !isConfigured) {
    console.error('VAPID 키가 없어 보낼 수 없습니다. server/.env 의');
    console.error('VAPID_PUBLIC_KEY·VAPID_PRIVATE_KEY 를 채우세요. (.env.example 참고)');
    process.exit(1);
  }

  const days = parseDays(args.days);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    /*
     * DATE·DATETIME 을 문자열로 받습니다.
     * Date 객체로 받으면 드라이버가 실행하는 기계의 시간대로 옮겨서, 시간대가
     * 맞는지 확인하려는 이 스크립트가 거짓말을 하게 됩니다.
     */
    dateStrings: true,
  });

  try {
    const [[clock]] = await conn.query(
      'SELECT @@session.time_zone AS tz, NOW() AS now, CURDATE() AS today'
    );

    const baseDate = args.date ?? clock.today;
    if (!ISO_DATE.test(baseDate)) {
      throw new Error(`--date 는 YYYY-MM-DD 모양이어야 합니다: '${baseDate}'`);
    }

    console.log(
      args.dryRun
        ? '접종·검진 알림 대상 (보내지 않고 확인만 합니다)'
        : '접종·검진 알림 발송'
    );
    console.log('');
    console.log('[시각]');
    console.log(`  DB    time_zone=${clock.tz}  NOW()=${clock.now}  CURDATE()=${clock.today}`);
    console.log(
      `  Node  TZ=${process.env.TZ || '(설정 없음)'} → ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
    );
    console.log(
      `  기준 날짜 = ${baseDate}${args.date ? '  (--date 로 지정)' : '  (DB 의 CURDATE())'}`
    );
    if (clock.today !== baseDate) {
      console.log('  ! 기준 날짜가 DB 의 오늘과 다릅니다. 확인용으로만 쓰세요.');
    }
    console.log('');

    /*
     * 중복 방지 표는 아직 없을 수 있습니다(alterVaccinationReminders.sql).
     * 없다고 멈추지 않고, 없는 채로 돌면서 그렇다고 알려 줍니다.
     */
    const [[dedupe]] = await conn.query(
      `SELECT COUNT(*) AS found FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'vaccination_reminders'`
    );
    const hasDedupeTable = dedupe.found > 0;

    if (args.send && !hasDedupeTable) {
      throw new Error(
        'vaccination_reminders 표가 없어 보낼 수 없습니다. 같은 알림이 두 번 나갑니다. ' +
          'scripts/alterVaccinationReminders.sql 을 먼저 적용하세요.'
      );
    }

    console.log('[중복 방지]');
    if (hasDedupeTable) {
      const [[sent]] = await conn.query('SELECT COUNT(*) AS n FROM vaccination_reminders');
      console.log(`  vaccination_reminders 있음 — 이미 보낸 ${sent.n}건은 대상에서 뺐습니다.`);
    } else {
      console.log('  vaccination_reminders 없음 — 이번에는 중복 여부를 보지 않았습니다.');
      console.log('  scripts/alterVaccinationReminders.sql 을 적용하면 이미 보낸 건이 빠집니다.');
    }
    console.log('');

    /*
     * 마감일을 미리 계산해 넣습니다.
     *
     * WHERE 에 DATEDIFF(due_date, ?) 를 쓰면 컬럼이 함수에 싸여 인덱스를 못 탑니다.
     * 날짜 목록으로 바꿔 due_date 를 그대로 비교하면 (done, due_date) 인덱스가 걸립니다.
     */
    const dueDates = days.map((day) => addDays(baseDate, day));
    const daysByDueDate = new Map(dueDates.map((date, i) => [date, days[i]]));

    const dedupeJoin = hasDedupeTable
      ? `LEFT JOIN vaccination_reminders r
                 ON r.vaccination_id = v.vaccination_id
                AND r.days_before = DATEDIFF(v.due_date, ?)`
      : '';
    const dedupeWhere = hasDedupeTable ? 'AND r.vaccination_id IS NULL' : '';

    const params = hasDedupeTable ? [baseDate, dueDates] : [dueDates];

    const [rows] = await conn.query(
      `SELECT v.vaccination_id, v.name AS schedule_name, v.due_date, v.due_time,
              p.pet_id, p.name AS pet_name,
              u.user_id, u.username, u.email, u.phone, u.social_type
         FROM pet_vaccinations v
         JOIN pets  p ON p.pet_id  = v.pet_id
         JOIN users u ON u.user_id = p.user_id
         ${dedupeJoin}
        WHERE v.done = 0
          AND u.deleted_at IS NULL
          AND v.due_date IN (?)
          ${dedupeWhere}
        ORDER BY v.due_date DESC, u.user_id, v.vaccination_id`,
      params
    );

    console.log('[대상]');
    for (const day of days) {
      const n = rows.filter((row) => daysByDueDate.get(row.due_date) === day).length;
      console.log(`  ${String(day).padStart(3)}일 전  ${String(n).padStart(4)}건`);
    }
    const owners = new Set(rows.map((row) => row.user_id));
    console.log(`  합계      ${String(rows.length).padStart(4)}건 / 보호자 ${owners.size}명`);
    console.log('');

    if (rows.length === 0) {
      console.log('보낼 것이 없습니다.');
      return;
    }

    /*
     * 보호자별 푸시 구독을 한 번에 받아옵니다.
     * 일정마다 따로 조회하면 같은 사람의 구독을 몇 번이고 다시 읽습니다.
     */
    const ownerIds = [...owners];
    const [subRows] = await conn.query(
      `SELECT subscription_id, user_id, endpoint, p256dh, auth
         FROM push_subscriptions WHERE user_id IN (?)`,
      [ownerIds]
    );
    const subsByUser = new Map();
    for (const sub of subRows) {
      if (!subsByUser.has(sub.user_id)) subsByUser.set(sub.user_id, []);
      subsByUser.get(sub.user_id).push(sub);
    }

    const reachable = ownerIds.filter((id) => (subsByUser.get(id) ?? []).length > 0);

    console.log(`[푸시 구독] 보호자 ${ownerIds.length}명 기준`);
    console.log(`  알림 켠 사람   ${reachable.length}명 / 기기 ${subRows.length}대`);
    console.log(`  알림 안 켠 사람 ${ownerIds.length - reachable.length}명`);
    if (reachable.length < ownerIds.length) {
      console.log('                 (알림을 켜지 않았거나, 아이폰을 홈 화면에 추가하지 않은 경우입니다)');
    }
    console.log('');

    if (!args.summaryOnly) {
      console.log('[상세]');
      for (const row of rows) {
        const day = daysByDueDate.get(row.due_date);
        const devices = (subsByUser.get(row.user_id) ?? []).length;
        console.log(
          `  ${String(day).padStart(2)}일 전  ${row.due_date}${row.due_time ? ' ' + String(row.due_time).slice(0, 5) : ''}  ${row.pet_name} / ${row.schedule_name}` +
            `  — ${row.username}(user ${row.user_id})  ` +
            (devices > 0 ? `기기 ${devices}대` : '구독 없음') +
            `  ${contactLabel(row)}`
        );
      }
      console.log('');
    }

    if (args.dryRun) {
      console.log('--dry-run 이라 아무것도 보내지 않았습니다.');
      return;
    }

    /*
     * 실제 발송.
     *
     * 한 일정에 기기가 여러 대면 모두 보냅니다. 한 대라도 나갔으면 "보냈다" 로
     * 적어 오늘 다시 돌아도 두 번 가지 않게 합니다. 전부 실패하면 적지 않습니다 —
     * 같은 날 다시 돌릴 때 재시도되어야 합니다.
     */
    const tally = { sent: 0, devices: 0, gone: 0, failed: 0, skipped: 0 };

    for (const row of rows) {
      const subs = subsByUser.get(row.user_id) ?? [];
      if (subs.length === 0) {
        tally.skipped += 1;
        continue;
      }

      const daysLeft = daysByDueDate.get(row.due_date);
      const payload = reminderPayload({
        petName: row.pet_name,
        scheduleName: row.schedule_name,
        daysLeft,
        dueDate: row.due_date,
        // 시각은 선택입니다. NULL 이면 문구에서 아예 빠집니다.
        dueTime: row.due_time ? String(row.due_time).slice(0, 5) : null,
      });

      let delivered = false;
      for (const sub of subs) {
        const result = await send(sub, payload);
        if (result === 'sent') {
          delivered = true;
          tally.devices += 1;
          await conn.query(
            'UPDATE push_subscriptions SET last_sent_at = NOW() WHERE subscription_id = ?',
            [sub.subscription_id]
          );
        } else if (result === 'gone') {
          /*
           * 구독이 없어졌습니다(알림 차단·기기 정리·만료). 지우지 않으면 매일
           * 실패하는 발송을 반복하고, 푸시 서비스에서 보내는 쪽 평판이 깎입니다.
           */
          tally.gone += 1;
          await conn.query('DELETE FROM push_subscriptions WHERE subscription_id = ?', [
            sub.subscription_id,
          ]);
        } else {
          tally.failed += 1;
        }
      }

      if (delivered) {
        tally.sent += 1;
        /*
         * IGNORE 로 둡니다. 같은 배치가 겹쳐 돌면 기본키에 걸리는데, 그건 이미
         * 다른 쪽이 보냈다는 뜻이라 오류가 아닙니다.
         */
        await conn.query(
          'INSERT IGNORE INTO vaccination_reminders (vaccination_id, days_before) VALUES (?, ?)',
          [row.vaccination_id, daysLeft]
        );
      }
    }

    console.log('[발송]');
    console.log(`  보낸 알림      ${tally.sent}건 / 기기 ${tally.devices}대`);
    console.log(`  구독 없어 거름 ${tally.skipped}건`);
    console.log(`  죽은 구독 정리 ${tally.gone}개`);
    console.log(`  실패(다시 시도) ${tally.failed}개`);
  } finally {
    await conn.end();
  }
}

/*
 * 순수 함수는 테스트에서 부를 수 있게 내보냅니다.
 * require 하는 것만으로 DB 에 붙으면 안 되므로 main 은 직접 실행할 때만 돕니다.
 */
module.exports = { parseDays, addDays, maskEmail, maskPhone };

if (require.main === module) {
  main().catch((error) => {
    // mysql2 오류는 err.sql 에 쿼리 전문을 들고 있어 통째로 찍지 않습니다.
    console.error('알림 대상을 뽑지 못했습니다:', error.message);
    process.exit(1);
  });
}
