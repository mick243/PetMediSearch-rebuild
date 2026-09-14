const express = require('express');
const {
  getPublicKey,
  getSubscription,
  subscribe,
  unsubscribe,
} = require('../controller/push');
const router = express.Router();

/**
 * @swagger
 * /push/key:
 *   get:
 *     tags: [Push]
 *     summary: 구독에 쓸 VAPID 공개키
 *     description: >
 *       화면이 푸시를 구독할 때 이 키가 필요합니다. 클라이언트 빌드에 박아 넣지 않고
 *       여기서 받아가므로, 키를 바꿔도 화면을 다시 빌드하지 않아도 됩니다.
 *     responses:
 *       200:
 *         description: "{ publicKey }"
 *       503:
 *         description: 푸시 알림이 설정되지 않았습니다. (VAPID 키 없음)
 */
router.get('/key', getPublicKey);

/**
 * @swagger
 * /push/subscriptions:
 *   get:
 *     tags: [Push]
 *     summary: 이 기기에서 알림을 켜 두었는지
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: endpoint
 *         schema: { type: string }
 *         description: 브라우저가 가진 구독 주소
 *     responses:
 *       200:
 *         description: "{ subscribed }"
 *   post:
 *     tags: [Push]
 *     summary: 알림 켜기 (기기 하나당 한 행, 이미 있으면 갱신)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: 알림을 켰습니다.
 *       400:
 *         description: 구독 정보가 올바르지 않습니다.
 *       401:
 *         description: 유효하지 않은 토큰입니다.
 *   delete:
 *     tags: [Push]
 *     summary: 알림 끄기 (이 기기 것만)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 알림을 껐습니다.
 */
router.get('/subscriptions', getSubscription);
router.post('/subscriptions', subscribe);
router.delete('/subscriptions', unsubscribe);

module.exports = router;
