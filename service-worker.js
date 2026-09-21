/* Fighting Force Web — network-first for app shell so updates are not stuck. */
const CACHE = 'ff-web-shell-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './emulator/data/loader.js',
  './emulator/data/emulator.min.js',
  './emulator/data/emulator.min.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isGameAsset(url) {
  return (
    url.includes('/games/') ||
    /\.(zip|bin|cue|iso|chd)$/i.test(url)
  );
}

function isAppShell(url) {
  return (
    url.endsWith('.html') ||
    url.endsWith('.js') ||
    url.endsWith('.css') ||
    url.endsWith('config.js') ||
    url.endsWith('/') ||
    url.includes('/src/')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Game files: always network, never Cache API
  if (isGameAsset(url.pathname)) {
    event.respondWith(fetch(req));
    return;
  }

  // App JS/CSS/HTML: network-first so fixes apply immediately
  if (isAppShell(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && (url.protocol === 'http:' || url.protocol === 'https:')) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cores / wasm: cache-first
  if (
    url.pathname.includes('/emulator/') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.data')
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
