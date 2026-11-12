// Service worker: rende l'app utilizzabile anche senza connessione.
const CACHE = 'uncinetto-v6';
const FILES = [
  './', 'index.html', 'style.css', 'app.js', 'db.js', 'manifest.webmanifest',
  'catalog.js',
  ...['sottobicchiere','presina','fiore','cuore','granny','pallina','sciarpa','cestino','berretto','coperta',
      'sashiko-campionario','sashiko-hitomezashi','sashiko-yamagata','sashiko-rammendo','sashiko-seigaiha','sashiko-asanoha'].map(n => `catalog/${n}.svg`),
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const sameOrigin = req => new URL(req.url).origin === self.location.origin;

// Prima prova la rete (così gli aggiornamenti arrivano), se manca usa la cache.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // 'no-cache': chiede sempre al server se il file è cambiato (niente versioni vecchie)
    fetch(sameOrigin(e.request) ? e.request.url : e.request, sameOrigin(e.request) ? { cache: 'no-cache' } : undefined)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match(e.request.url.split('?')[0])))
  );
});
