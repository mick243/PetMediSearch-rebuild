/**
 * 웹 푸시 발송.
 *
 * 브라우저는 푸시를 직접 받지 않고, 제조사가 운영하는 푸시 서비스(크롬이면 Google
 * FCM, 사파리면 Apple)를 거쳐 받습니다. 우리가 하는 일은 그 서비스에 "이 구독
 * 주소로 이 암호문을 전해 달라" 고 부탁하는 것뿐입니다. VAPID 키 한 쌍은 그
 * 부탁이 우리에게서 온 것임을 증명하는 데 씁니다.
 *
 * 키 만들기 (한 번만, 만든 뒤 .env 에 넣습니다):
 *   node -e "console.log(require('web-push').generateVAPIDKeys())"
 *
 * 공개키는 화면에도 나가야 합니다. 서버가 GET /push/key 로 알려 주므로 클라이언트
 * 빌드에 따로 박아 넣지 않습니다 — 두 곳에 적으면 키를 바꿀 때 한쪽만 바뀝니다.
 */
const webpush = require('web-push');
const { logError } = require('./logError');

const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
/*
 * 푸시 서비스가 문제가 생겼을 때 연락할 곳. mailto: 여야 합니다.
 * 규격상 필수라 없으면 발송이 401 로 거절됩니다.
 */
const contact = process.env.VAPID_SUBJECT || 'mailto:admin@petmedisearch.local';

const isConfigured = Boolean(publicKey && privateKey);

if (isConfigured) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
}

/**
 * 푸시 서비스가 보관해 줄 시간(초).
 *
 * 기기가 꺼져 있으면 그동안 맡아 뒀다가 켜질 때 전해 줍니다. 하루를 넘겨 보관하면
 * "D-3" 알림이 D-1 에 도착하는 일이 생기므로 하루로 끊습니다.
 */
const TTL_SECONDS = 24 * 60 * 60;

/**
 * 발송 결과.
 *
 *   sent    보냈습니다. 사용자가 봤는지까지는 알 수 없습니다.
 *   gone    구독이 없어졌습니다(알림 차단·앱 삭제·만료). 그 행을 지워야 합니다.
 *   failed  일시적인 실패. 구독은 그대로 두고 다음에 다시 시도합니다.
 *
 * 404·410 을 failed 로 뭉뚱그리면 죽은 구독이 영원히 남아, 매일 실패하는 발송을
 * 반복하며 푸시 서비스에서 우리 평판이 깎입니다.
 */
const send = async (subscription, payload) => {
  if (!isConfigured) return 'failed';

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: TTL_SECONDS }
    );
    return 'sent';
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) return 'gone';
    /*
     * 오류 객체를 통째로 남기지 않습니다. web-push 의 오류에는 요청 헤더가 붙어
     * 있고 거기에 VAPID 서명이 들어갑니다.
     */
    logError('push:send', new Error(`status=${error.statusCode ?? '?'}`));
    return 'failed';
  }
};

/**
 * 알림 문구.
 *
 * 제목에 아이 이름을 먼저 둡니다. 여러 마리를 키우면 누구 일정인지가 먼저
 * 궁금하고, 잠금화면에서는 제목만 보이는 경우가 많습니다.
 */
const reminderPayload = ({ petName, scheduleName, daysLeft, dueDate, dueTime }) => {
  /*
   * 시각은 있을 때만 붙입니다. 모르는 일정에 00:00 을 채워 넣으면 "자정 예정" 으로
   * 읽히는데, 그건 알려 준 것이 아니라 틀린 것을 알려 준 것입니다.
   */
  const when = dueTime ? `${dueDate} ${dueTime}` : dueDate;
  return {
    title: `${petName} ${scheduleName} D-${daysLeft}`,
    body:
      daysLeft === 1 ? `내일(${when}) 예정이에요.` : `${daysLeft}일 뒤 ${when} 예정이에요.`,
    url: '/vaccinations',
  };
};

module.exports = { send, reminderPayload, isConfigured, publicKey, TTL_SECONDS };
