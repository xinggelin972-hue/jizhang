const CACHE = 'ledger-v2';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 页面本身：先走网络，拿新版；断网再回退缓存
function networkFirst(req) {
  return fetch(req).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
               .then(hit => hit || caches.match('index.html')));
}

// 图标等静态资源：先用缓存，同时在后台更新
function staleWhileRevalidate(req) {
  return caches.match(req, { ignoreSearch: true }).then(hit => {
    const refresh = fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit);
    return hit || refresh;
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  if (req.mode === 'navigate') return e.respondWith(networkFirst(req));
  e.respondWith(staleWhileRevalidate(req));
});
