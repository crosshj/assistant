/**
 * GunDB Network Discovery utilities
 * Functions for exploring and debugging GunDB network connectivity
 */

/**
 * Query each peer for common discovery endpoints
 */
export async function queryPeerEndpoints(gun, isSelfPeer) {
	const peers = gun.back('opt.peers') || {};
	const peerUrls = Object.keys(peers);

	// Filter out self-peers
	const externalPeers = peerUrls.filter((url) => !isSelfPeer(url));
	console.log('🌍 External peers to query:', externalPeers);

	if (externalPeers.length === 0) {
		console.log('  ℹ️ No external peers to query (all peers are self)');
		return;
	}

	const endpoints = [
		'/peers',
		'/catalog',
		'/rooms',
		'/stats',
		'/info',
		'/discovery',
		'/graph',
		'/health',
	];

	for (const peerUrl of externalPeers) {
		console.log(`\n🌐 Querying peer: ${peerUrl}`);

		for (const endpoint of endpoints) {
			try {
				const url = peerUrl.replace('/gun', endpoint);
				const response = await fetch(url, {
					method: 'GET',
					timeout: 5000,
				});

				if (response.ok) {
					const data = await response.text();
					console.log(
						`  ✅ ${endpoint}:`,
						data.substring(0, 200) +
							(data.length > 200 ? '...' : '')
					);
				}
			} catch (error) {
				// Silently ignore errors - most endpoints won't exist
			}
		}
	}
}

/**
 * Query GunDB for common catalog patterns
 */
export async function queryGunCatalogs(gun) {
	console.log('\n📚 Querying GunDB catalogs...');

	const catalogQueries = [
		'~catalog',
		'catalog',
		'peers',
		'rooms',
		'graphs',
		'discovery',
		'network',
	];

	for (const query of catalogQueries) {
		try {
			gun.get(query).once((data) => {
				if (data && Object.keys(data).length > 1) {
					// More than just metadata
					console.log(`  📋 ${query}:`, data);
				}
			});
		} catch (error) {
			// Ignore errors
		}
	}
}

/**
 * Query for active rooms/graphs
 */
export async function queryActiveRooms(gun) {
	console.log('\n🏠 Querying active rooms...');

	// Query the graphs structure
	gun.get('graphs').once((graphs) => {
		if (!graphs) return;

		const rooms = Object.keys(graphs).filter(
			(key) => key !== '_' && key !== '#'
		);
		console.log('  🏠 Available rooms:', rooms);

		// Get details for each room
		rooms.slice(0, 5).forEach((room) => {
			// Limit to first 5
			gun.get('graphs')
				.get(room)
				.once((roomData) => {
					if (roomData) {
						const nodeCount = roomData.nodes
							? Object.keys(roomData.nodes).length - 1
							: 0;
						const edgeCount = roomData.edges
							? Object.keys(roomData.edges).length - 1
							: 0;
						console.log(
							`    🏠 ${room}: ${nodeCount} nodes, ${edgeCount} edges`
						);
					}
				});
		});
	});
}

/**
 * Query for users and persistence
 */
export async function queryUsers(gun) {
	console.log('\n👥 Querying for users...');

	// Common user discovery patterns
	const userQueries = [
		'~@', // User references
		'users', // Common user collection
		'~users', // Tilde user collection
		'online', // Online users
		'presence', // User presence
		'~presence', // Tilde presence
		'sessions', // Active sessions
	];

	for (const query of userQueries) {
		try {
			gun.get(query).once((data) => {
				if (data && typeof data === 'object') {
					const keys = Object.keys(data).filter(
						(key) => key !== '_' && key !== '#'
					);
					if (keys.length > 0) {
						console.log(`  👤 ${query}:`, keys.slice(0, 10)); // Show first 10
					}
				}
			});
		} catch (error) {
			// Ignore errors
		}
	}

	// Try to find user keys by scanning for common patterns
	gun.get('~').once((userData) => {
		if (userData && typeof userData === 'object') {
			const userKeys = Object.keys(userData).filter(
				(key) => key !== '_' && key !== '#' && key.length > 20 // User keys are typically long
			);
			if (userKeys.length > 0) {
				console.log(`  🔑 User keys found: ${userKeys.length}`);
				console.log(`  🔑 Sample keys:`, userKeys.slice(0, 3));
			}
		}
	});
}

/**
 * Query for persistence patterns
 */
export async function queryPersistencePatterns(gun) {
	console.log('\n💾 Querying persistence patterns...');

	// Check for common persistence indicators
	const persistenceQueries = [
		'meta', // Metadata
		'~meta', // Tilde metadata
		'index', // Indexes
		'~index', // Tilde indexes
		'registry', // Registry of data
		'~registry', // Tilde registry
		'catalog', // Data catalog
		'directory', // Directory structure
		'timestamps', // Timestamp data
		'~timestamps', // Tilde timestamps
	];

	for (const query of persistenceQueries) {
		try {
			gun.get(query).once((data) => {
				if (data && typeof data === 'object') {
					const keys = Object.keys(data).filter(
						(key) => key !== '_' && key !== '#'
					);
					if (keys.length > 0) {
						console.log(`  💿 ${query}:`, keys.length, 'entries');
						if (keys.length < 20) {
							console.log(`    📋 Keys:`, keys);
						}
					}
				}
			});
		} catch (error) {
			// Ignore errors
		}
	}

	// Check for recent activity by looking at timestamps
	gun.get('~')
		.map()
		.once((data, key) => {
			if (data && data._ && data._.put) {
				const timestamp = data._.put['>'];
				if (timestamp) {
					const age = Date.now() - timestamp;
					const hours = Math.floor(age / (1000 * 60 * 60));
					if (hours < 24) {
						// Recent activity (last 24 hours)
						console.log(
							`  ⏰ Recent activity: ${key.substring(
								0,
								20
							)}... (${hours}h ago)`
						);
					}
				}
			}
		});

	// Check for data size indicators
	setTimeout(() => {
		const localStorage = gun.back('opt.localStorage');
		if (
			localStorage &&
			typeof window !== 'undefined' &&
			window.localStorage
		) {
			let totalSize = 0;
			let gunKeys = 0;

			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i);
				if (key && key.startsWith('gun/')) {
					gunKeys++;
					const value = window.localStorage.getItem(key);
					totalSize += (key.length + (value ? value.length : 0)) * 2; // Rough byte estimate
				}
			}

			if (gunKeys > 0) {
				console.log(
					`  📊 Local storage: ${gunKeys} GunDB keys, ~${Math.round(
						totalSize / 1024
					)}KB`
				);
			}
		}
	}, 1000); // Delay to let other queries complete
}

/**
 * Query for app namespaces
 */
export async function queryNamespaces(gun) {
	console.log('\n🏷️ Querying app namespaces...');

	// Common app namespace patterns
	const commonNamespaces = [
		// Communication
		'chat',
		'messages',
		'forum',
		'comments',
		'social',
		'posts',

		// Productivity
		'docs',
		'notes',
		'todo',
		'tasks',
		'calendar',
		'wiki',
		'blog',

		// Media & Files
		'files',
		'images',
		'media',
		'uploads',

		// Games & Entertainment
		'game',
		'games',
		'lobby',
		'rooms',
		'scores',

		// Data & Analytics
		'data',
		'analytics',
		'logs',
		'events',
		'metrics',

		// E-commerce & Business
		'shop',
		'products',
		'orders',
		'inventory',
		'customers',

		// Development & Tech
		'code',
		'repos',
		'issues',
		'projects',
		'api',

		// Your app's namespace
		'graphs',
		'bookmarks',
	];

	console.log('🔍 Scanning for active app namespaces...');

	const foundNamespaces = [];

	for (const namespace of commonNamespaces) {
		try {
			gun.get(namespace).once((data) => {
				if (data && typeof data === 'object') {
					const keys = Object.keys(data).filter(
						(key) => key !== '_' && key !== '#'
					);
					if (keys.length > 0) {
						foundNamespaces.push({
							name: namespace,
							keyCount: keys.length,
							sampleKeys: keys.slice(0, 5),
						});
						console.log(
							`  📁 ${namespace}: ${keys.length} keys`,
							keys.length <= 5
								? keys
								: `[${keys.slice(0, 3).join(', ')}, ...]`
						);
					}
				}
			});
		} catch (error) {
			// Ignore errors
		}
	}

	// Also scan the root level for any other namespaces
	setTimeout(() => {
		gun.once((rootData) => {
			if (rootData && typeof rootData === 'object') {
				const rootKeys = Object.keys(rootData).filter(
					(key) =>
						key !== '_' &&
						key !== '#' &&
						!key.startsWith('~') && // Skip user spaces
						!commonNamespaces.includes(key) && // Skip already checked
						key.length < 20 // Skip long keys (likely not namespace names)
				);

				if (rootKeys.length > 0) {
					console.log(
						'  🔍 Other root-level keys:',
						rootKeys.slice(0, 10)
					);

					// Check a few of these for content
					rootKeys.slice(0, 5).forEach((key) => {
						gun.get(key).once((data) => {
							if (data && typeof data === 'object') {
								const subKeys = Object.keys(data).filter(
									(k) => k !== '_' && k !== '#'
								);
								if (subKeys.length > 0) {
									console.log(
										`    📂 ${key}: ${subKeys.length} items`
									);
								}
							}
						});
					});
				}
			}
		});

		// Summary after delay
		setTimeout(() => {
			if (foundNamespaces.length > 0) {
				console.log(
					`\n📊 Namespace Summary: Found ${foundNamespaces.length} active app namespaces`
				);
				foundNamespaces
					.sort((a, b) => b.keyCount - a.keyCount)
					.slice(0, 5)
					.forEach((ns) => {
						console.log(`  🏆 ${ns.name}: ${ns.keyCount} keys`);
					});
			} else {
				console.log('  ℹ️ No common app namespaces found with data');
			}
		}, 2000);
	}, 1000);
}

/**
 * Log network statistics
 */
export function logNetworkStats(gun) {
	console.log('\n📊 Network Statistics:');

	const peers = gun.back('opt.peers') || {};
	const connectedPeers = Object.values(peers).filter(
		(peer) => peer && peer.wire && peer.wire.readyState === 1
	).length;

	console.log(`  🔗 Total peers: ${Object.keys(peers).length}`);
	console.log(`  ✅ Connected peers: ${connectedPeers}`);
	console.log(
		`  📡 Connection rate: ${Math.round(
			(connectedPeers / Object.keys(peers).length) * 100
		)}%`
	);
	console.log(
		`  💾 localStorage enabled: ${gun.back('opt.localStorage') || false}`
	);
	console.log(
		`  🔄 Multicast enabled: ${gun.back('opt.multicast') || false}`
	);
	console.log(`  📞 WebRTC enabled: ${gun.back('opt.webrtc') || false}`);
}

/**
 * Check if a peer URL refers to the current instance (self)
 */
export function isSelfPeer(peerUrl) {
	// Check for localhost variations
	const localhostPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

	// Check for current window location (browser context)
	if (typeof window !== 'undefined' && window.location) {
		const currentOrigin = window.location.origin;
		if (peerUrl.startsWith(currentOrigin)) {
			return true;
		}
	}

	// Check for localhost patterns
	for (const pattern of localhostPatterns) {
		if (peerUrl.includes(pattern)) {
			return true;
		}
	}

	// Check for same-origin in Node.js context
	if (typeof process !== 'undefined' && process.env) {
		const port = process.env.PORT || '8080';
		if (peerUrl.includes(`:${port}/gun`)) {
			return true;
		}
	}

	return false;
}

/**
 * Run comprehensive network discovery queries
 * Logs results to console for debugging and exploration
 */
export async function runNetworkDiscovery() {
	console.log('🔍 === NETWORK DISCOVERY ===');

	const gun = this._rawGun;

	// 1. Query each peer for common discovery endpoints
	// await queryPeerEndpoints(gun, isSelfPeer);

	// 2. Query GunDB for common catalog patterns
	await queryGunCatalogs(gun);

	// 3. Query for active rooms/graphs
	// await queryActiveRooms(gun);

	// 4. Query for users and persistence
	await queryUsers(gun);

	// 5. Query for persistence patterns
	await queryPersistencePatterns(gun);

	// 6. Query for app namespaces
	await queryNamespaces(gun);

	// 7. Network statistics
	// logNetworkStats(gun);
}
