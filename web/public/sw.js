const CACHE_NAME = 'tradr-game-v2';
const OFFLINE_CACHE = 'tradr-offline-v2';
const DATA_CACHE = 'tradr-data-v2';

const STATIC_ASSETS = [
  '/',
  '/play',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/window.svg',
];

const DATA_URLS = [
  '/data/index.json',
  '/data/aapl.json',
  '/data/amd.json',
  '/data/amzn.json',
  '/data/googl.json',
  '/data/meta.json',
  '/data/msft.json',
  '/data/nvda.json',
  '/data/tsla.json',
  '/data/spy.json',
  '/data/qqq.json',
  '/data/btcusd.json',
  '/data/ethusd.json',
  '/data/eurusd.json',
  '/data/gbpusd.json',
  '/data/usdjpy.json',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {cache: 'reload'})));
      }),
      caches.open(DATA_CACHE).then((cache) => {
        console.log('[SW] Caching game data');
        return cache.addAll(DATA_URLS.map(url => new Request(url, {cache: 'reload'})));
      })
    ]).then(() => {
      console.log('[SW] Skip waiting');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== OFFLINE_CACHE && 
              cacheName !== DATA_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Handle page navigation requests
  if (url.pathname === '/' || 
      url.pathname === '/play' || 
      url.pathname === '/community' ||
      url.pathname === '/multiplayer') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Try cache first
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache, try root page
            return caches.match('/').then((rootPage) => {
              if (rootPage) {
                return rootPage;
              }
              // Last resort: offline page
              return caches.match('/offline.html');
            });
          });
        })
    );
    return;
  }

  // Default: Try network first, then cache, then offline page
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If it's a navigation request and we have no cache, show offline page
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          // For other requests, just fail
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_GAME_DATA') {
    const data = event.data.payload;
    caches.open(DATA_CACHE).then((cache) => {
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(event.data.url, response);
    });
  }
});
