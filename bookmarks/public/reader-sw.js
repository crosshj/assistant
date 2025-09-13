// Minimal service worker for Reader PWA
self.addEventListener('install', (event) => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

// Handle file opening from system
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'OPEN_FILE') {
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
