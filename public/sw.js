// Hue service worker.
// Network-first for HTML so new deploys reach users immediately; cache-first
// for hashed assets (immutable by filename) and static icons. Bumping CACHE
// invalidates any caches from the previous, fully cache-first version that
// pinned HTML to dead hashed-asset URLs.
const CACHE = 'hue-v2';
const STATIC_ASSETS = ['/manifest.webmanifest', '/favicon.svg', '/apple-touch-icon.svg', '/icon-192.svg', '/icon-512.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navigations: network-first so a new deploy is picked up on next load.
  // Fall back to cache only when offline.
  const isHTML = req.mode === 'navigate' || req.destination === 'document';
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // Hashed assets and static files: cache-first.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
