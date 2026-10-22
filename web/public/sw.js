const CACHE_NAME = 'tradr-game-v4';
const OFFLINE_CACHE = 'tradr-offline-v4';
const DATA_CACHE = 'tradr-data-v4';

const STATIC_ASSETS = [
  '/',
  '/play',
  '/offline.html',
  '/manifest.json',
  '/manifest.webmanifest',
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
      // Cache static assets - don't fail if some fail
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(new Request(url, {cache: 'reload'}))
              .catch(err => console.log(`[SW] Failed to cache ${url}:`, err))
          )
        );
      }),
      // Cache game data
      caches.open(DATA_CACHE).then((cache) => {
        console.log('[SW] Precaching game data...');
        let cached = 0;
        return Promise.allSettled(
          DATA_URLS.map((url, i) => 
            cache.add(new Request(url, {cache: 'reload'}))
              .then(() => {
                cached++;
                console.log(`[Precache] Cached ${url.replace('/data/', '').replace('.json', '')} (${cached}/${DATA_URLS.length})`);
              })
              .catch(err => console.log(`[SW] Failed to cache ${url}:`, err))
          )
        ).then(() => {
          console.log(`[Precache] Complete: ${cached} cached, ${DATA_URLS.length - cached} failed`);
        });
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

  // Only handle http/https requests, ignore chrome-extension:// etc
  if (!url.protocol.startsWith('http')) {
    return;
  }

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

  // Handle Next.js chunks and static files - CACHE FIRST for offline support
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.webp')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Return cache immediately for offline support
          if (cachedResponse) {
            // Update cache in background (no await)
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
            }).catch(() => {});
            return cachedResponse;
          }
          
          // No cache - try network and cache result
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Completely offline and no cache - fail gracefully
            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
        });
      })
    );
    return;
  }

  // Handle page navigation requests - CACHE FIRST for offline
  if (url.pathname === '/' || 
      url.pathname === '/play' || 
      url.pathname === '/community' ||
      url.pathname === '/multiplayer' ||
      url.pathname === '/register') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // If we have cache, return it immediately and update in background
          if (cachedResponse) {
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse.clone());
                });
              }
            }).catch(() => {});
            return cachedResponse;
          }
          
          // No cache - try network
          return fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return response;
            })
            .catch(() => {
              // Offline and no cache - show offline page
              return caches.match('/offline.html').then(offlinePage => {
                return offlinePage || new Response('Offline', { 
                  status: 503, 
                  statusText: 'Service Unavailable' 
                });
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
