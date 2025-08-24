const Gun = require('gun');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Initialize Gun with the server
const gun = Gun({
	web: server,
	peers: [
		// Connect to public relays for redundancy
		'https://gun-us.herokuapp.com/gun',
		'https://gun-eu.herokuapp.com/gun',
	],
	localStorage: false, // Disable localStorage in server environment
	radisk: true, // Enable disk storage for persistence
});

// Add some logging for monitoring
gun.on('hi', (peer) => {
	console.log('Peer connected:', peer.url || 'unknown');
});

gun.on('bye', (peer) => {
	console.log('Peer disconnected:', peer.url || 'unknown');
});

// Health check endpoint
server.on('request', (req, res) => {
	if (req.url === '/health') {
		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
		});
		res.end(
			JSON.stringify({
				status: 'healthy',
				timestamp: Date.now(),
				uptime: process.uptime(),
			})
		);
		return;
	}

	// Add CORS headers for all requests
	if (req.method === 'OPTIONS') {
		res.writeHead(200, {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		});
		res.end();
		return;
	}
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
	console.log(`🔫 GunDB relay server running on port ${PORT}`);
	console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/gun`);
	console.log(`🌐 HTTP endpoint: http://localhost:${PORT}/gun`);
	console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
	console.log('Shutting down gracefully...');
	server.close(() => {
		process.exit(0);
	});
});

process.on('SIGINT', () => {
	console.log('Shutting down gracefully...');
	server.close(() => {
		process.exit(0);
	});
});
