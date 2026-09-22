/**
 * PHASE 2 — app-shell caching only, NOT offline data.
 *
 * This makes the installed app resilient to a flaky connection (it opens
 * and navigates to previously-visited pages when offline) and nothing more.
 * It never caches or intercepts cross-origin requests (the API lives on
 * api.jrecc.org, a different origin), and it never caches anything under
 * this origin's own API-shaped paths either, so it cannot serve stale
 * participant/consent/interview data as if it were live.
 *
 * True offline recording (queue a recording locally, sync when back online)
 * needs IndexedDB storage and a sync protocol — deliberately not attempted
 * here. Recording still requires connectivity to reach the API.
 */
const CACHE_NAME = 'merline-shell-v1';
const SHELL_ASSETS = ['/login', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {
        // A single failed asset (e.g. offline during install) must not
        // block activation.
      }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin (the API) and anything that looks like an API/data path is
  // never touched — this service worker caches page shell only.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/login'))),
  );
});
