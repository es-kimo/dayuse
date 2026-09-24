// 웹 푸시 유틸리티 함수

export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
}

export function isIos(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (error) {
    console.error('Service Worker 등록 실패:', error);
    return null;
  }
}

/**
 * 푸시 구독에 쓸 등록 객체를 얻는다.
 *
 * navigator.serviceWorker.ready는 등록이 없거나 실패하면 영원히 resolve되지 않는다.
 * 등록을 직접 확인하고, 없으면 등록한 뒤 활성화까지만 기다린다.
 */
export async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    const registration = existing ?? (await registerServiceWorker());
    if (!registration) return null;

    // 설치 직후에는 pushManager를 쓸 수 있어도 활성 워커가 아직 없을 수 있다.
    if (!registration.active) {
      await navigator.serviceWorker.ready;
    }
    return registration;
  } catch (error) {
    console.error('Service Worker 등록 확인 실패:', error);
    return null;
  }
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** 구독 객체에서 서버가 저장하는 형태를 뽑아낸다. */
export function toSubscriptionData(subscription: PushSubscription): PushSubscriptionData {
  const p256dh = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');

  if (!p256dh || !auth) {
    throw new Error('푸시 암호화 키를 생성할 수 없습니다.');
  }

  return {
    endpoint: subscription.endpoint,
    p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
    auth: btoa(String.fromCharCode(...new Uint8Array(auth)))
  };
}

/**
 * 이미 있는 구독이 지금 서버가 쓰는 VAPID 공개키로 만들어진 것인지 확인한다.
 *
 * 푸시 서비스는 구독을 발급할 때 VAPID 공개키를 함께 묶어 두기 때문에,
 * 서버 키가 바뀌면 기존 구독으로 보낸 알림은 403으로 거부된다.
 * 또 키가 다른 상태에서 subscribe()를 다시 부르면 InvalidStateError가 난다.
 */
function matchesServerKey(subscription: PushSubscription, vapidPublicKey: string): boolean {
  const applied = subscription.options?.applicationServerKey;
  // 구형 브라우저는 options를 노출하지 않는다. 확인할 수 없으면 건드리지 않는다.
  if (!applied) return true;

  const expected = urlBase64ToUint8Array(vapidPublicKey);
  const actual = new Uint8Array(applied);
  if (actual.length !== expected.length) return false;
  return actual.every((byte, index) => byte === expected[index]);
}

/**
 * 이 브라우저가 가진 구독 중 서버 키와 맞는 것을 돌려준다.
 * 키가 어긋난 구독은 재구독을 막으므로 해지한다.
 */
export async function getMatchingSubscription(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  const registration = await getPushRegistration();
  if (!registration) return null;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;

  if (matchesServerKey(subscription, vapidPublicKey)) {
    return subscription;
  }

  await subscription.unsubscribe();
  return null;
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionData | null> {
  if (!isPushNotificationSupported()) {
    throw new Error('이 브라우저는 웹 푸시 알림을 지원하지 않습니다.');
  }

  // 권한 요청은 사용자 제스처 안에서 바로 호출돼야 한다. 앞에 await를 두면 안 된다.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('알림 권한이 거부되었거나 허용되지 않았습니다.');
  }

  const existing = await getMatchingSubscription(vapidPublicKey);
  if (existing) {
    return toSubscriptionData(existing);
  }

  const registration = await getPushRegistration();
  if (!registration) {
    throw new Error('알림 수신 준비(Service Worker 등록)에 실패했습니다.');
  }

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey.buffer as ArrayBuffer
  });

  return toSubscriptionData(subscription);
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getPushRegistration();
  if (!registration) return null;
  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function unsubscribePush(): Promise<string | null> {
  const subscription = await getCurrentPushSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    return endpoint;
  }
  return null;
}
