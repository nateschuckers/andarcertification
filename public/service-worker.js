const CACHE_NAME = 'my-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // You can add paths to other static assets here, like your main JS and CSS files.
  // The build process often generates unique filenames, so this is sometimes handled by a build tool plugin,
  // but for a basic setup, caching the main pages is a great start.
];

// Event: install
// This event is fired when the service worker is first installed.
self.addEventListener('install', event => {
  // We use event.waitUntil to make sure the service worker doesn't move on
  // from the installing phase until it has finished executing the code inside.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // addAll() takes an array of URLs, fetches them, and adds the responses to the cache.
        return cache.addAll(urlsToCache);
      })
  );
});

// Event: fetch
// This event is fired every time the browser tries to fetch a resource (like a page, image, or script).
self.addEventListener('fetch', event => {
  event.respondWith(
    // caches.match() looks for a matching request in the cache.
    caches.match(event.request)
      .then(response => {
        // If a matching response is found in the cache, we return it.
        if (response) {
          return response;
        }
        // If the request isn't in the cache, we fetch it from the network.
        return fetch(event.request);
      }
    )
  );
});

