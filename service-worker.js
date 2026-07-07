/* 백신 챙겨 · 오프라인 캐시 (정적 앱이라 서버 불필요) */
const CACHE = 'vc-cache-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // 페이지 이동: 네트워크 우선, 실패 시 캐시된 index.html
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }
  // 그 외 자원: 캐시 우선
  e.respondWith(caches.match(request).then(hit => hit || fetch(request)));
});
