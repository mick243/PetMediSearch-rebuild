import {
  deletePushSubscription,
  fetchPushKey,
  fetchPushState,
  savePushSubscription,
} from '../apis/push.api';

/**
 * 웹 푸시 켜고 끄기.
 *
 * 구독은 사람이 아니라 **이 브라우저**에 붙습니다. 휴대폰에서 켜도 노트북에는
 * 켜지지 않습니다. 그래서 화면의 토글도 "이 기기에서 받기" 입니다.
 */

/**
 * 이 브라우저가 웹 푸시를 할 수 있는지.
 *
 * 아이폰을 사파리 탭으로 쓰면 PushManager 자체가 없습니다. 홈 화면에 추가해
 * 앱처럼 열어야 생깁니다(iOS 16.4+). 그래서 "안 됨" 과 "아직 설치 안 함" 을
 * 가려서 알려 줘야 사용자가 무엇을 해야 할지 압니다.
 */
export const pushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/**
 * 홈 화면에 추가해서 연 상태인지(= iOS 에서 푸시가 되는 상태).
 * display-mode 는 manifest 의 display 값과 같아집니다.
 */
export const isInstalledApp = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    // 사파리는 표준 media query 대신 이 값을 씁니다.
    (navigator as { standalone?: boolean }).standalone === true);

/** 아이폰·아이패드인지. 안내 문구를 가르는 데만 씁니다. */
export const isIos = (): boolean =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * VAPID 공개키를 브라우저가 받는 모양으로 바꿉니다.
 *
 * 서버는 URL-safe base64 로 주는데 PushManager 는 Uint8Array 만 받습니다.
 * `-`·`_` 를 되돌리고 길이를 4의 배수로 맞추지 않으면 atob 이 던집니다 —
 * 그런데 그 오류가 "구독 실패" 로만 보여서 원인을 찾기 어렵습니다.
 */
export const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

/** 서비스 워커를 등록하고 준비될 때까지 기다립니다. */
const ready = async (): Promise<ServiceWorkerRegistration> => {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
};

/** 이 기기가 지금 구독 중인지. 브라우저와 서버가 모두 알고 있어야 켜진 것입니다. */
export const currentPushState = async (): Promise<boolean> => {
  if (!pushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  /*
   * 브라우저에만 구독이 남아 있고 서버에는 없을 수 있습니다(탈퇴·정리·다른 계정).
   * 그때 화면이 "켜짐" 으로 보이면 오지 않는 알림을 기다리게 됩니다.
   */
  return fetchPushState(subscription.endpoint).catch(() => false);
};

/**
 * 알림 켜기. 켜졌으면 true, 사용자가 거절했으면 false.
 * 브라우저가 아예 못 하는 경우에는 던집니다 — 화면에서 문구를 갈라야 합니다.
 */
export const enablePush = async (): Promise<boolean> => {
  if (!pushSupported())
    throw new Error('이 브라우저는 알림을 지원하지 않습니다.');

  /*
   * 권한 요청은 사용자가 버튼을 누른 흐름 안에서만 해야 합니다.
   * 화면이 뜨자마자 물으면 대부분 거절하고, 한 번 거절하면 브라우저 설정에
   * 들어가기 전까지 다시 물을 수 없습니다.
   */
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await ready();
  const existing = await registration.pushManager.getSubscription();

  /*
   * 이미 구독이 있어도 서버에 다시 보냅니다. 브라우저에는 남아 있는데 서버에는
   * 없는 상태(다른 계정으로 켰거나 죽은 구독으로 지워진 경우)를 여기서 맞춥니다.
   */
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      // 푸시를 받으면 반드시 알림을 띄우겠다는 약속. 크롬은 이것 없이는 구독을 거절합니다.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(await fetchPushKey()),
    }));

  await savePushSubscription(subscription.toJSON());
  return true;
};

/** 알림 끄기. 이 기기 것만 끕니다. */
export const disablePush = async (): Promise<void> => {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  /*
   * 서버를 먼저 지웁니다. 브라우저 구독을 먼저 끊으면 endpoint 를 잃어버려서
   * 서버에 죽은 행이 남고, 그 행으로 계속 발송을 시도하게 됩니다.
   */
  await deletePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
};
