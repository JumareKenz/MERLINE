/**
 * Merline service worker — app shell for offline field work.
 *
 * What it does:
 *  - Precaches the field app's screens and brand assets so the installed
 *    field app opens, and can record, with no connection. Recording itself
 *    never needed the network: audio is written to IndexedDB by the page
 *    (see src/lib/field/). This file only makes sure the page can load.
 *  - Pages: network-first, falling back to the cached copy. The field
 *    interview screen is one static route (/field/interview?id=…), matched
 *    ignoring the query, so any assigned interview opens offline.
 *  - /_next/static/*: cache-first. Those files are content-hashed and
 *    immutable, so this is both correct and the fastest possible startup.
 *
 * What it never does:
 *  - Touch cross-origin requests. The API lives on another origin; data and
 *    uploads always go to the network, so nothing stale is shown as live.
 *  - Touch non-GET requests or anything under /api.
 *  - Cache redirects or error responses (a signed-out 307 to /login must
 *    not be replayed later as the "page").
 */
const VERSION = 'v2';
const SHELL_CACHE = `merline-shell-${VERSION}`;
const STATIC_CACHE = `merline-static-${VERSION}`;

const PRECACHE = [
  '/offline.html',
  '/field',
  '/field/interview',
  '/field/uploads',
  '/field/participants',
  '/field/participants/new',
  '/field-login',
  '/manifest.json',
  '/field.webmanifest',
  '/brand/mark-64.png',
  '/brand/mark-128.png',
  '/brand/mark-dark-128.png',
  '/icons/icon-192.png',
  '/icons/icon-maskable-192.png',
];

self.addEventListener('install', (event) => {
  // Tolerate failures one by one: a single unavailable page (e.g. a
  // signed-out redirect during install) must not block the rest. Pages the
  // user is not yet signed in for are warmed again after sign-in.
  event.waitUntil(warm(PRECACHE));
  self.skipWaiting();
});

/**
 * Cache pages *and the script/style chunks they reference*. An offline page
 * whose JavaScript was never downloaded would render as a blank shell, so
 * warming parses each page's HTML for its /_next/static assets.
 */
async function warm(urls) {
  const shell = await caches.open(SHELL_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
        if (!isCacheable(res)) return;
        const type = res.headers.get('content-type') || '';
        if (type.includes('text/html')) {
          const html = await res.clone().text();
          const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+\.(?:js|css)/g) || [])];
          await Promise.all(
            assets.map(async (asset) => {
              if (await statics.match(asset)) return;
              const a = await fetch(asset).catch(() => null);
              if (a && isCacheable(a)) await statics.put(asset, a);
            }),
          );
        }
        await shell.put(url, res);
      } catch (e) {
        // Offline or refused: try again on the next warm.
      }
    }),
  );
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** The page asks for its screens to be made available offline (after sign-in). */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'warm' && Array.isArray(data.urls)) {
    const urls = data.urls.filter((u) => typeof u === 'string' && u.startsWith('/')).slice(0, 50);
    event.waitUntil(warm(urls));
  }
});

function isCacheable(response) {
  return response && response.ok && response.type === 'basic' && !response.redirected;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request, url));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) {
    const copy = response.clone();
    caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
  }
  return response;
}

async function networkFirst(request, url) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const copy = response.clone();
      caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
    }
    return response;
  } catch (err) {
    const exact = await caches.match(request);
    if (exact) return exact;

    if (request.mode === 'navigate') {
      // Same screen, different query (e.g. another interview id).
      const sameScreen = await caches.match(request, { ignoreSearch: true });
      if (sameScreen) return sameScreen;
      // On the field host '/' is the field home; '/login' is field-login.
      const isField = self.location.hostname.startsWith('field.') || url.pathname.startsWith('/field');
      if (isField) {
        const home = (await caches.match('/field')) || (await caches.match('/'));
        if (home) return home;
      }
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    }
    throw err;
  }
}
