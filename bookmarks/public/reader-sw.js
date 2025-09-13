// Reader App Service Worker
const CACHE_NAME = 'reader-app-v1';
const STATIC_CACHE_URLS = [
	'/reader',
	'/reader-manifest.json',
	'/reader-sw.js',
	'/reader-favicon.svg',
	// Note: Vite will bundle all JS/CSS into assets/ directory with hashed names
	// The service worker will cache these dynamically as they're requested
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	console.log('Service Worker: Installing...');
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				console.log('Service Worker: Caching static assets');
				return cache.addAll(STATIC_CACHE_URLS);
			})
			.then(() => {
				console.log('Service Worker: Installation complete');
				return self.skipWaiting();
			})
			.catch((error) => {
				console.error('Service Worker: Installation failed', error);
			})
	);
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	console.log('Service Worker: Activating...');
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames.map((cacheName) => {
						if (cacheName !== CACHE_NAME) {
							console.log(
								'Service Worker: Deleting old cache',
								cacheName
							);
							return caches.delete(cacheName);
						}
					})
				);
			})
			.then(() => {
				console.log('Service Worker: Activation complete');
				return self.clients.claim();
			})
	);
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
	// Skip non-GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	// Skip chrome-extension and other non-http requests
	if (!event.request.url.startsWith('http')) {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			// Return cached version if available
			if (cachedResponse) {
				console.log(
					'Service Worker: Serving from cache',
					event.request.url
				);
				return cachedResponse;
			}

			// Otherwise fetch from network
			console.log(
				'Service Worker: Fetching from network',
				event.request.url
			);
			return fetch(event.request)
				.then((response) => {
					// Don't cache non-successful responses
					if (
						!response ||
						response.status !== 200 ||
						response.type !== 'basic'
					) {
						return response;
					}

					// Clone the response for caching
					const responseToCache = response.clone();

					// Cache the response for future use
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});

					return response;
				})
				.catch((error) => {
					console.error('Service Worker: Fetch failed', error);

					// Return offline page for navigation requests
					if (event.request.mode === 'navigate') {
						return caches.match('/reader');
					}

					throw error;
				});
		})
	);
});

// Handle file opening from system
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'OPEN_FILE') {
		console.log('Service Worker: Received file open request', event.data);
		// Forward to main thread
		self.clients.matchAll().then((clients) => {
			clients.forEach((client) => {
				client.postMessage({
					type: 'FILE_OPENED',
					file: event.data.file,
				});
			});
		});
	}
});

// Background sync for file operations (if supported)
self.addEventListener('sync', (event) => {
	if (event.tag === 'file-save') {
		console.log('Service Worker: Background sync for file save');
		event.waitUntil(
			// Handle background file saving
			Promise.resolve()
		);
	}
});
