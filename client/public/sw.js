/*
 * 서비스 워커 — 푸시 알림을 받는 자리.
 *
 * 브라우저는 탭이 닫혀 있어도 이 파일을 깨워 알림을 띄웁니다. 그래서 앱 코드가
 * 아니라 여기에 있어야 합니다. 번들러를 거치지 않도록 public/ 에 그대로 둡니다 —
 * 해시가 붙은 이름이 되면 등록 주소가 배포마다 바뀝니다.
 *
 * 서비스 워커의 범위(scope)는 이 파일이 놓인 경로입니다. 루트에 두어야 앱 전체를
 * 덮습니다.
 */

/* eslint-env serviceworker */

/** 알림을 누르면 열 기본 주소. 서버가 url 을 보내 주면 그것을 씁니다. */
const DEFAULT_URL = '/vaccinations';

self.addEventListener('push', (event) => {
  /*
   * 본문이 없거나 깨진 경우에도 알림은 띄웁니다.
   * userVisibleOnly 로 구독했기 때문에, 푸시를 받고 아무것도 안 보여 주면
   * 브라우저가 경고를 띄우거나 구독을 끊습니다.
   */
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {};
  }

  const title = payload.title || '접종·검진 알림';
  const options = {
    body: payload.body || '예정된 일정이 있어요.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || DEFAULT_URL },
    /*
     * 같은 태그의 알림은 덮어씁니다. 기기가 며칠 꺼져 있다가 켜지면 밀린 알림이
     * 한꺼번에 도착하는데, 그때 잠금화면이 같은 안내로 도배되지 않게 합니다.
     */
    tag: 'petmedisearch-reminder',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || DEFAULT_URL;

  /*
   * 이미 열려 있는 탭이 있으면 그 탭을 쓰고, 없을 때만 새로 엽니다.
   * 매번 새 탭을 열면 알림을 누를 때마다 같은 앱이 여러 개 쌓입니다.
   */
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});

/*
 * 브라우저가 구독을 스스로 갱신하는 경우가 있습니다(만료·키 교체).
 * 그대로 두면 서버에 남은 옛 주소로 보내다 계속 실패합니다. 새 구독을 서버에
 * 알려 줍니다. 이 시점에는 로그인 토큰을 알 수 없어, 앱이 다음에 열릴 때
 * registerPush() 가 다시 맞춰 주는 것에 기댑니다.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? event.oldSubscription.options : undefined)
      .catch(() => undefined)
  );
});
