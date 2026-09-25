// dayuse Web Push & PWA Service Worker (v0.4.0)

const CACHE_NAME = 'dayuse-static-v0.4.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/assets/brand/logo-combination.svg',
  '/assets/brand/og-default.png',
  '/assets/brand/og-invite.png',
  '/assets/brand/og-expired.png',
  '/assets/brand/symbol.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('기본 정적 자산 프리캐시 건너뜀:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('dayuse-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// fetch 이벤트: API 요청은 네트워크 전용, 정적 자산은 캐시 우선/폴백
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // GET 요청이 아니거나 API 경로는 캐시를 타지 않고 항상 네트워크로 통신
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // http/https 스킴만 캐싱
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // HTML 페이지 탐색 요청 (SPA 네비게이션)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 정적 리소스 (JS, CSS, 이미지, 폰트)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// --- 웹 푸시 알림 핸들러 ---

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
