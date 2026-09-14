import { httpClient } from './http';

/** 서버가 가진 VAPID 공개키. 클라이언트 빌드에 박아 넣지 않는 이유는 server/push.js 주석에. */
export const fetchPushKey = async () => {
  const res = await httpClient.get<{ publicKey: string }>('/push/key');
  return res.data.publicKey;
};

/** 이 기기에서 알림을 켜 두었는지. 토글의 초기값에 씁니다. */
export const fetchPushState = async (endpoint: string) => {
  const res = await httpClient.get<{ subscribed: boolean }>(
    `/push/subscriptions?endpoint=${encodeURIComponent(endpoint)}`
  );
  return res.data.subscribed;
};

export const savePushSubscription = async (
  subscription: PushSubscriptionJSON
) => {
  const res = await httpClient.post('/push/subscriptions', subscription);
  return res.data;
};

export const deletePushSubscription = async (endpoint: string) => {
  // axios 의 delete 는 본문을 data 로 받습니다. 주소에 실으면 로그에 그대로 남습니다.
  const res = await httpClient.delete('/push/subscriptions', {
    data: { endpoint },
  });
  return res.data;
};
