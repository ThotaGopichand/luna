// Luna Service Worker
// Provides offline functionality for marked documents

const CACHE_NAME = 'luna-cache-v1';
const OFFLINE_CACHE = 'luna-offline-v1';

// Core app shell files to cache
const APP_SHELL = [
    '/',
    '/vault',
    '/journal',
    '/analytics',
    '/playbook',
    '/settings',
    '/login',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell');
            return cache.addAll(APP_SHELL);
        })
    );
    self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== OFFLINE_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Chrome extensions and other non-http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // For navigation requests, try network first, then cache
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful responses
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('/');
                    });
                })
        );
        return;
    }

    // For offline-marked documents (stored in IndexedDB with OFFLINE_CACHE)
    if (url.pathname.includes('/documents/') || url.pathname.includes('/screenshots/')) {
        event.respondWith(
            caches.open(OFFLINE_CACHE).then((cache) => {
                return cache.match(request).then((cached) => {
                    if (cached) {
                        console.log('[SW] Serving from offline cache:', url.pathname);
                        return cached;
                    }
                    return fetch(request);
                });
            })
        );
        return;
    }

    // For other requests, try cache first, then network
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }
            return fetch(request).then((response) => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                // Cache static assets
                if (
                    url.pathname.includes('/_next/static/') ||
                    url.pathname.includes('/icons/') ||
                    url.pathname.endsWith('.js') ||
                    url.pathname.endsWith('.css')
                ) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            });
        })
    );
});

// Message handler for caching offline documents
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_DOCUMENT') {
        const { url } = event.data;
        console.log('[SW] Caching document for offline:', url);

        caches.open(OFFLINE_CACHE).then((cache) => {
            fetch(url)
                .then((response) => {
                    if (response.ok) {
                        cache.put(url, response);
                        event.ports[0].postMessage({ success: true });
                    } else {
                        event.ports[0].postMessage({ success: false, error: 'Failed to fetch' });
                    }
                })
                .catch((error) => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
        });
    }

    if (event.data && event.data.type === 'REMOVE_CACHED_DOCUMENT') {
        const { url } = event.data;
        console.log('[SW] Removing document from offline cache:', url);

        caches.open(OFFLINE_CACHE).then((cache) => {
            cache.delete(url).then((deleted) => {
                event.ports[0].postMessage({ success: deleted });
            });
        });
    }
});
