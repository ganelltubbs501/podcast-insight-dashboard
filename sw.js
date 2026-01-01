const CACHE_NAME = 'podcast-insight-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Attempt to cache core resources but don't fail install if an entry can't be fetched (e.g., cross-origin icons)
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(urlsToCache.map((url) => cache.add(url))).then(() => self.skipWaiting())
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).catch((err) => {
        // If network fetch fails (offline or blocked), return index.html fallback if available
        console.warn('ServiceWorker fetch failed for', event.request.url, err);
        return caches.match('/index.html');
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});