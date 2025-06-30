// Minimal service worker for PWA share target
self.addEventListener('install', (event) => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

let lastShareData = null;

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	// Only intercept POSTs to root (share target)
	if (event.request.method === 'POST' && url.pathname === '/') {
		event.respondWith(
			(async () => {
				const formData = await event.request.formData();
				lastShareData = {
					title: formData.get('title') || '',
					text: formData.get('text') || '',
					url: formData.get('url') || '',
				};
				// Redirect to root so the app loads normally
				return Response.redirect('/', 303);
			})()
		);
	}
});

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'getShareData') {
		if (lastShareData) {
			event.source.postMessage({ type: 'shareData', ...lastShareData });
			lastShareData = null; // Only deliver once
		}
	}
});
