const CACHE_NAME = 'neural-recon-v0.0.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './game.js',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Theme system
  './themes/theme-base.js',
  './themes/theme-manager.js',
  './themes/theme-cyberpunk.js',
  // Maskable icons
  './icons/icon-maskable.svg',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - stale-while-revalidate strategy
// Returns cached version immediately for speed, then fetches fresh version
// in background to update cache for next visit
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Start fetching fresh version in background
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Update cache with fresh version (if valid)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse); // If network fails, fall back to cache

        // Return cached version immediately, or wait for network if not cached
        return cachedResponse || fetchPromise;
      });
    })
  );
});

