// public/sw.js
// Minimal service worker. Its only real job is to satisfy PWA installability
// criteria (Chrome requires a registered SW with a fetch handler) and give a
// basic offline fallback for the app shell. It deliberately does NOT try to
// cache or intercept Firebase/Gemini/Supabase requests — those are
// cross-origin, so they're left alone automatically by the same-origin check
// below. Bump CACHE_NAME whenever you want to force clients to drop old caches.

const CACHE_NAME = 'planda-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {
      // Non-fatal: some assets (e.g. hashed bundle files) don't exist yet at
      // install time. The app shell still installs; runtime caching below
      // fills in the rest as they're fetched.
    }))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests on our own origin. Everything else (Firestore
  // watch streams, Gemini API calls, Supabase, cross-origin fonts, etc.)
  // passes straight through untouched.
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Navigations: network-first so users always get the latest app shell when
  // online, falling back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first, then fall back to network and populate the
  // cache for next time.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
