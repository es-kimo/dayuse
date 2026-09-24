// dayuse Web Push Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'dayuse 리마인더',
    body: '오늘 인증할 챌린지가 남아 있어요!',
    url: '/today',
    tag: 'dayuse-reminder'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'dayuse-reminder',
    renotify: true,
    data: {
      url: data.url || '/today'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // 브라우저가 구독을 스스로 폐기하고 새로 발급할 때 발생한다.
  // 여기서 다시 구독해 두지 않으면 구독이 통째로 사라져 이후 알림이 오지 않는다.
  // 인증 토큰은 localStorage에 있어 Service Worker에서 읽을 수 없으므로,
  // 새 endpoint를 서버에 반영하는 일은 페이지 쪽 syncPushSubscription()이 맡는다.
  const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
  if (!applicationServerKey) return;

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/today';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열려 있는 탭이 있다면 포커스하고 해당 URL로 이동
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // 열린 창이 없으면 새 창 오픈
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
