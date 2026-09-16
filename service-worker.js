const CACHE_VERSION = 'v5';
const CACHE_PREFIX = 'barista-study-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const APP_RESOURCES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-32.png',
  './icons/icon-maskable-512.png',
  './data/exams.json',
  './data/questions/level2.json'
];

const CACHE_FIRST_RESOURCES = [
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-32.png',
  './icons/icon-maskable-512.png'
];

const appResourcePaths = new Set(APP_RESOURCES.map((path) => new URL(path, self.registration.scope).pathname));
const cacheFirstPaths = new Set(CACHE_FIRST_RESOURCES.map((path) => new URL(path, self.registration.scope).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_RESOURCES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, fallbackPath = null) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackPath) {
      const fallback = await caches.match(new URL(fallbackPath, self.registration.scope));
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;

  if (request.mode === 'navigate') {
    if (appResourcePaths.has(url.pathname)) event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  if (!appResourcePaths.has(url.pathname)) return;
  event.respondWith(cacheFirstPaths.has(url.pathname) ? cacheFirst(request) : networkFirst(request));
});
