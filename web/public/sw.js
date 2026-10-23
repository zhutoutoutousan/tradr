const CACHE_NAME = 'tradr-game-v8';
const OFFLINE_CACHE = 'tradr-offline-v8';
const DATA_CACHE = 'tradr-data-v8';

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
  '/data/bac.json',
  '/data/dis.json',
  '/data/nflx.json',
  '/data/ba.json',
  '/data/pfe.json',
  '/data/intc.json',
  '/data/csco.json',
  '/data/orcl.json',
  '/data/unh.json',
  '/data/mcd.json',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install event - Critical for PWA offline mode!');
  event.waitUntil(
    Promise.all([
      // Cache critical pages - MUST succeed for PWA to work offline
      caches.open(CACHE_NAME).then(async (cache) => {
        console.log('[SW] Caching critical pages for PWA...');
        
        // Cache home page (PWA start_url) - CRITICAL!
        try {
          await cache.add(new Request('/', {cache: 'reload'}));
          // Also cache with query params variants (PWA may add params)
          await cache.add(new Request('/?source=pwa', {cache: 'reload'}));
          console.log('[SW] ✅ Cached / (PWA home)');
        } catch (err) {
          console.error('[SW] ❌ CRITICAL: Failed to cache /:', err);
        }
        
        // Cache /play page
        try {
          await cache.add(new Request('/play', {cache: 'reload'}));
          console.log('[SW] ✅ Cached /play');
        } catch (err) {
          console.error('[SW] ❌ Failed to cache /play:', err);
        }
        
        // Cache offline fallback page (last resort)
        try {
          await cache.add(new Request('/offline.html', {cache: 'reload'}));
          console.log('[SW] ✅ Cached /offline.html (fallback)');
        } catch (err) {
          console.error('[SW] ❌ Failed to cache /offline.html:', err);
        }
        
        // Cache other static assets (non-critical)
        const otherAssets = [
          '/manifest.json', 
          '/manifest.webmanifest', 
          '/favicon.svg', 
          '/window.svg',
          '/icon',
          '/apple-icon'
        ];
        for (const url of otherAssets) {
          try {
            await cache.add(new Request(url, {cache: 'reload'}));
          } catch (err) {
            // Non-critical, just log
            console.log(`[SW] Optional cache ${url}:`, err.message);
          }
        }
      }),
      
      // Cache game data for offline play
      caches.open(DATA_CACHE).then((cache) => {
        console.log('[SW] Precaching game data for offline play...');
        let cached = 0;
        return Promise.allSettled(
          DATA_URLS.map((url, i) => 
            cache.add(new Request(url, {cache: 'reload'}))
              .then(() => {
                cached++;
                console.log(`[Precache] Cached ${url.replace('/data/', '').replace('.json', '')} (${cached}/${DATA_URLS.length})`);
              })
              .catch(err => console.log(`[SW] Failed to cache ${url}:`, err.message))
          )
        ).then(() => {
          console.log(`[Precache] Complete: ${cached} cached, ${DATA_URLS.length - cached} failed`);
          if (cached >= 10) {
            console.log('[SW] ✅ PWA ready for offline play!');
          }
        });
      })
    ]).then(() => {
      console.log('[SW] Installation complete, activating...');
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

  // Handle page navigation requests - AGGRESSIVE CACHE FIRST
  // For PWA: This handles app launch in airplane mode
  if (request.mode === 'navigate' || 
      url.pathname === '/' || 
      url.pathname === '/play' || 
      url.pathname === '/community' ||
      url.pathname === '/multiplayer' ||
      url.pathname === '/register') {
    event.respondWith(
      // Try multiple cache strategies to ensure PWA works offline
      Promise.race([
        // Strategy 1: Exact match with ignoreSearch
        caches.match(request, { ignoreSearch: true }),
        // Strategy 2: Match by URL pathname only
        caches.match(url.pathname),
        // Strategy 3: If it's root, try explicit '/'
        url.pathname === '/' ? caches.match('/') : Promise.resolve(null),
      ]).then((cachedResponse) => {
        // ALWAYS return cache if available (critical for PWA in airplane mode)
        if (cachedResponse) {
          console.log('[SW] ✅ Serving from cache:', url.pathname, '(PWA offline mode)');
          // Update cache in background when online
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        
        // No cache found - try network (only happens on first visit)
        console.log('[SW] ⚠️ No cache, trying network:', url.pathname);
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
            // LAST RESORT: Only for first-time offline users (no PWA installed yet)
            console.error('[SW] ❌ Completely offline with no cache:', url.pathname);
            return caches.match('/offline.html').then(offlinePage => {
              return offlinePage || new Response(
                '<h1>Offline</h1><p>Please visit online first to enable offline mode.</p>', 
                { 
                  status: 503, 
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html' }
                }
              );
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
