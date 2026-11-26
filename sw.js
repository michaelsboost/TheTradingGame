// Import Workbox
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const { registerRoute } = workbox.routing;
const { NetworkFirst, StaleWhileRevalidate, CacheFirst } = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { ExpirationPlugin } = workbox.expiration;
const { clientsClaim, skipWaiting } = workbox.core;

// Define cache name dynamically based on the project name
const cacheName = 'TheTradingGame-cache';

// Force update when a new service worker is available
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Immediately apply new service worker
});

// Clear old caches when activating a new service worker
self.addEventListener('activate', async (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== cacheName && name !== cacheName + '-modules')
          .map(name => caches.delete(name))
      );
    })
  );
  clientsClaim(); // Take control of all open clients
});

// NEW: Cache ES module imports from CDNs (like unpkg.com)
registerRoute(
  ({ url, request }) => {
    // Cache module requests from common CDNs
    return url.hostname === 'unpkg.com' || 
           url.hostname === 'cdn.skypack.dev' ||
           url.hostname === 'esm.sh' ||
           url.hostname === 'jspm.dev' ||
           // Also cache any .js or .mjs files that might be modules
           request.destination === 'script' && url.pathname.match(/\.(js|mjs)$/);
  },
  new StaleWhileRevalidate({
    cacheName: cacheName + '-modules',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100, // Store more modules
        maxAgeSeconds: 30 * 24 * 60 * 60, // Cache for 30 days
      }),
    ],
  })
);

// Use Network First for primary scripts, styles, and documents
registerRoute(
  ({ request }) => {
    return request.destination === 'document' || 
           request.destination === 'style' ||
           // For local scripts (not from CDN)
           (request.destination === 'script' && new URL(request.url).hostname === location.hostname);
  },
  new NetworkFirst({
    cacheName: cacheName,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache images, fonts, audio, and video for performance
registerRoute(
  ({ request }) =>
    request.destination === 'image' || request.destination === 'font' ||
    request.destination === 'audio' || request.destination === 'video',
  new CacheFirst({
    cacheName: cacheName,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50, // Limit stored assets
        maxAgeSeconds: 7 * 24 * 60 * 60, // Cache for 7 days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Also cache the workbox library itself
registerRoute(
  ({ url }) => url.href.includes('storage.googleapis.com/workbox-cdn'),
  new CacheFirst({
    cacheName: cacheName + '-workbox',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

// Listen for messages to skip waiting and apply new updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});