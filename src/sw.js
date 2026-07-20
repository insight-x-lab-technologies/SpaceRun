/* Service Worker - cache offline (servless PWA, sem arquivos externos).
   Estratégia: sempre busca a versão mais nova quando houver rede, com fallback
   ao cache para funcionar offline. Garante que uma atualização no servidor
   (incl. iPhone/Safari) seja aplicada e não fique "presa" em dados antigos. */
const CACHE = 'spacerun-v4';
const VERSION = '0.4';
const ASSETS = [
  '.',
  'index.html',
  'manifest.json',
  'icon.svg',
  'css/style.css',
  'js/storage.js',
  'js/i18n.js',
  'js/ships.js',
  'js/achievements.js',
  'js/audio.js',
  'js/themes.js',
  'js/input.js',
  'js/game.js',
  'js/ui.js',
  'js/share.js',
  'js/main.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
      .then(() => {
        // Avisa todas as abas abertas de que há uma nova versão disponível,
        // para que a página possa recarregar e usar os novos assets.
        return self.clients.matchAll({ type: 'window' }).then(clients =>
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: VERSION }))
        );
      })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // não intercepta terceiros

  // Navegações (index.html): NETWORK-FIRST para sempre usar a página mais nova.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put('index.html', copy));
          return resp;
        })
        .catch(() => caches.match('index.html').then(c => c || caches.match('.')))
    );
    return;
  }

  // Demais assets: STALE-WHILE-REVALIDATE (resposta instantânea do cache,
  // atualiza em segundo plano para a próxima carga ficar atualizada).
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
