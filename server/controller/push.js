/**
 * 웹 푸시 구독 등록·해제.
 *
 * 구독은 사람이 아니라 **기기**에 붙습니다. 한 사람이 휴대폰과 노트북에서 각각
 * 켜면 행이 둘입니다. 끌 때도 그 기기 것만 지웁니다.
 */
const conn = require('../mysql');
const { logError } = require('../logError');
const { verifyToken } = require('./authUser');
const { publicKey, isConfigured } = require('../push');

/** 푸시 주소 길이 상한. 스키마의 varchar 와 같은 값이어야 합니다. */
const MAX_ENDPOINT_LENGTH = 512;
const MAX_KEY_LENGTH = 255;

/** 브라우저가 주는 주소는 https 뿐입니다. 그 밖은 우리가 부르면 안 되는 곳입니다. */
const ENDPOINT_SCHEME = /^https:\/\//i;

const requireUser = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    return null;
  }
  return decoded.id;
};

/**
 * 화면이 구독할 때 쓸 공개키.
 *
 * 클라이언트 빌드에 박아 넣지 않고 여기서 받아갑니다. 두 곳에 적으면 키를 바꿀 때
 * 한쪽만 바뀌고, 그러면 구독은 만들어지는데 발송이 조용히 실패합니다.
 */
exports.getPublicKey = (req, res) => {
  if (!isConfigured) {
    return res.status(503).json({ message: '푸시 알림이 설정되지 않았습니다.' });
  }
  return res.json({ publicKey });
};

exports.subscribe = (req, res) => {
  const user_id = requireUser(req, res);
  if (!user_id) return;

  const endpoint = String(req.body?.endpoint ?? '').trim();
  const p256dh = String(req.body?.keys?.p256dh ?? '').trim();
  const auth = String(req.body?.keys?.auth ?? '').trim();

  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ message: '구독 정보가 올바르지 않습니다.' });
  }
  if (!ENDPOINT_SCHEME.test(endpoint) || endpoint.length > MAX_ENDPOINT_LENGTH) {
    return res.status(400).json({ message: '구독 정보가 올바르지 않습니다.' });
  }
  if (p256dh.length > MAX_KEY_LENGTH || auth.length > MAX_KEY_LENGTH) {
    return res.status(400).json({ message: '구독 정보가 올바르지 않습니다.' });
  }

  /*
   * 같은 기기가 다시 구독하면 같은 endpoint 가 옵니다. UNIQUE 에 걸린 것을 받아
   * 갱신합니다 — 먼저 SELECT 로 확인하면 두 탭이 동시에 켤 때 사이로 빠져나갑니다.
   * user_id 도 갱신합니다. 한 기기를 다른 사람이 로그인해 쓰면 주인이 바뀝니다.
   */
  const query = `
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      p256dh  = VALUES(p256dh),
      auth    = VALUES(auth)`;

  conn.query(query, [user_id, endpoint, p256dh, auth], (err) => {
    if (err) {
      logError('push:subscribe', err);
      return res.status(500).json({ message: '알림을 켜지 못했습니다.' });
    }
    return res.status(201).json({ message: '알림을 켰습니다.' });
  });
};

exports.unsubscribe = (req, res) => {
  const user_id = requireUser(req, res);
  if (!user_id) return;

  const endpoint = String(req.body?.endpoint ?? '').trim();
  if (!endpoint) {
    return res.status(400).json({ message: '구독 정보가 올바르지 않습니다.' });
  }

  // 본인 구독만 지웁니다. 남의 endpoint 를 알아도 끌 수 없어야 합니다.
  conn.query(
    'DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?',
    [endpoint, user_id],
    (err) => {
      if (err) {
        logError('push:unsubscribe', err);
        return res.status(500).json({ message: '알림을 끄지 못했습니다.' });
      }
      /*
       * 없던 구독을 꺼도 성공으로 답합니다. 화면에서는 "꺼진 상태" 라는 결과가
       * 같고, 있고 없고를 알려 주면 남의 구독 존재 여부를 떠볼 수 있습니다.
       */
      return res.json({ message: '알림을 껐습니다.' });
    }
  );
};

/** 이 사용자가 이 기기에서 알림을 켜 두었는지. 화면의 토글 초기값에 씁니다. */
exports.getSubscription = (req, res) => {
  const user_id = requireUser(req, res);
  if (!user_id) return;

  const endpoint = String(req.query?.endpoint ?? '').trim();
  if (!endpoint) return res.json({ subscribed: false });

  conn.query(
    'SELECT 1 FROM push_subscriptions WHERE endpoint = ? AND user_id = ? LIMIT 1',
    [endpoint, user_id],
    (err, rows) => {
      if (err) {
        logError('push:getSubscription', err);
        return res.status(500).json({ message: '알림 설정을 불러오지 못했습니다.' });
      }
      return res.json({ subscribed: rows.length > 0 });
    }
  );
};
