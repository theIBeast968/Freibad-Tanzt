const CACHE = 'sfreibad-v5';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/js/stats-track.js',
        '/js/dj-videos.js',
        '/js/dj-preview.js',
        '/js/flyer-modal.js',
        '/styles.css',
        '/favicon-32.png',
        '/icon-192.png',
        '/icon-512.png',
        '/manifest.webmanifest',
      ]).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((response) => {
      const clone = response.clone();
      if (event.request.url.startsWith(self.location.origin) && /\.(html|css|js|png|webmanifest)$/i.test(event.request.url)) {
        caches.open(CACHE).then((c) => c.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});
