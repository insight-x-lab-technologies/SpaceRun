/* Service Worker - cache offline (servless PWA, sem arquivos externos) */
const CACHE = 'spacerun-v1';
const ASSETS = [
  '.',
  'index.html',
  'manifest.json',
  'icon.svg',
  'css/style.css',
  'js/storage.js',
  'js/i18n.js',
  'js/ships.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/apple-touch-icon.png',
  'js/audio.js',
  'js/input.js',
  'js/game.js',
  'js/ui.js',
  'js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() => cached)
    )
  );
});
