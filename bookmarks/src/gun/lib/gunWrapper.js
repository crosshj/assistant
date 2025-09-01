/**
 * GunDB Wrapper - Provides a clean API that hides GunDB's complexity
 * Automatically cleans data and includes props when reading nodes/edges
 */
export class GunDBWrapper {
	constructor(connection, currentRoom = null) {
		this.connection = connection;
		this.currentRoom = currentRoom;
	}

	/**
	 * Get a clean node with props included
	 */
	async getNode(room, nodeId) {
		return new Promise((resolve) => {
			const gun = this.connection.gun;
			const nodeRef = gun
				.get('graphs')
				.get(room)
				.get('nodes')
				.get(nodeId);

			nodeRef.once((nodeData) => {
				if (!nodeData) {
					resolve(null);
					return;
				}

				// Clean the node data, removing GunDB metadata
				const cleanNode = this.cleanNodeData(nodeData);
				resolve(cleanNode);
			});
		});
	}

	/**
	 * Get FULL node data including ALL GunDB metadata for debugging
	 * This shows the raw data structure that GunDB returns
	 */
	async getNodeFullData(room, nodeId) {
		return new Promise((resolve) => {
			const gun = this.connection.gun;
			const nodeRef = gun
				.get('graphs')
				.get(room)
				.get('nodes')
				.get(nodeId);

			console.log(
				'🔍 GunDBWrapper: Getting FULL node data for debugging:',
				room,
				nodeId
			);

			nodeRef.once((nodeData) => {
				if (nodeData) {
					console.log({ nodeData });
				}
				resolve(nodeData);
			});
		});
	}

	/**
	 * Get a clean edge with props included
	 */
	async getEdge(room, edgeId) {
		return new Promise((resolve) => {
			const gun = this.connection.gun;
			const edgeRef = gun
				.get('graphs')
				.get(room)
				.get('edges')
				.get(edgeId);

			edgeRef.once((edgeData) => {
				if (!edgeData) {
					resolve(null);
					return;
				}

				// Clean the edge data, removing GunDB metadata
				const cleanEdge = this.cleanEdgeData(edgeData);
				resolve(cleanEdge);
			});
		});
	}

	/**
	 * Test if isolated instance approach is working
	 * This helps debug sync interference issues
	 */
	async testIsolatedInstance() {
		try {
			const isolatedGun = this.connection.createIsolatedInstance();
			const testRef = isolatedGun
				.get('graphs')
				.get('public')
				.get('nodes')
				.get('test');

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Isolated test timeout'));
				}, 2000);

				testRef.once((data) => {
					clearTimeout(timeout);
					resolve(data);
				});
			});
		} catch (error) {
			throw new Error(`Isolated test failed: ${error.message}`);
		}
	}

	/**
	 * Debug method: Check what data is actually stored in a node
	 * This helps diagnose why props aren't being retrieved
	 */
	async debugNodeData(room, nodeId) {
		try {
			const gunRef = this.connection.gun
				.get('graphs')
				.get(room)
				.get('nodes')
				.get(nodeId);

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Debug timeout'));
				}, 2000);

				gunRef.once((data) => {
					clearTimeout(timeout);
					if (data && data !== 'undefined') {
						resolve(data);
					} else {
						reject(new Error('No data found'));
					}
				});
			});
		} catch (error) {
			throw new Error(`Debug failed: ${error.message}`);
		}
	}

	/**
	 * Test if the isolated approach is working properly
	 */
	async testIsolatedPropsFetch(room, elementType, elementId) {
		try {
			const props = await this.getPropsIsolated(
				room,
				elementType,
				elementId
			);
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Try to get props from existing graph data in memory
	 * This is the most non-interfering approach since it doesn't make GunDB calls
	 */
	async getPropsFromMemory(room, elementType, elementId) {
		try {
			// This would need access to the graph data that's already loaded
			// For now, return empty props - this method can be enhanced later
			return {};
		} catch (error) {
			return {};
		}
	}

	/**
	 * Get props directly from GunDB - this is the proper approach
	 * No UI dependencies, pure data service
	 */
	async getPropsFromGunDB(elementId, isNode = true) {
		try {
			if (!this.currentRoom) {
				return {};
			}

			const baseRef = this.connection.gun
				.get('graphs')
				.get(this.currentRoom)
				.get(isNode ? 'nodes' : 'edges')
				.get(elementId);

			const propsRef = baseRef.get('props');

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Props fetch timeout'));
				}, 2000);

				const listener = (data) => {
					clearTimeout(timeout);
					propsRef.off('value', listener);
					if (data && data !== 'undefined') {
						const cleanProps = this.cleanPropsData(data);
						resolve(cleanProps);
					} else {
						resolve({});
					}
				};

				propsRef.on('value', listener);
			});
		} catch (error) {
			return {};
		}
	}

	/**
	 * Get props using the main connection but with careful, non-interfering approach
	 * This method reads props without triggering sync events
	 */
	async getPropsCarefully(room, elementId, isNode = true) {
		try {
			const baseRef = this.connection.gun
				.get('graphs')
				.get(room)
				.get(isNode ? 'nodes' : 'edges')
				.get(elementId);

			const propsRef = baseRef.get('props');

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Careful props timeout'));
				}, 2000);

				// Use a very short-lived listener that removes itself immediately
				const listener = (data) => {
					clearTimeout(timeout);
					propsRef.off('value', listener);
					if (data && data !== 'undefined') {
						const cleanProps = this.cleanPropsData(data);
						resolve(cleanProps);
					} else {
						resolve({});
					}
				};

				propsRef.on('value', listener);
			});
		} catch (error) {
			throw new Error(`Careful props failed: ${error.message}`);
		}
	}

	/**
	 * Get props using a completely isolated GunDB instance with minimal interference
	 * This method creates a new GunDB instance with only essential peers
	 */
	async getPropsIsolated(room, elementType, elementId) {
		try {
			// Create a completely new GunDB instance with minimal configuration
			const isolatedGun = Gun({
				peers: ['https://gun-us.herokuapp.com/gun'], // Single peer only
				localStorage: false, // No local storage
				retry: 0, // No retries
				timeout: 2000, // Very short timeout
			});

			// Create a reference to ONLY the props field
			const propsRef = isolatedGun
				.get('graphs')
				.get(room)
				.get(elementType === 'node' ? 'nodes' : 'edges')
				.get(elementId)
				.get('props');

			// Use a one-time listener with immediate cleanup
			const listener = (propsData) => {
				// Clean up immediately
				this.cleanupIsolatedInstance(isolatedGun);

				if (!propsData) {
					return;
				}

				// Extract clean props
				const cleanProps = this.extractCleanProps(propsData);
				return cleanProps;
			};

			// Listen once
			propsRef.once(listener);
		} catch (error) {
			throw new Error(`Isolated props failed: ${error.message}`);
		}
	}

	/**
	 * Clean up isolated GunDB instance to prevent lingering connections
	 */
	cleanupIsolatedInstance(isolatedGun) {
		try {
			// Try to disconnect the isolated instance
			if (isolatedGun && typeof isolatedGun.off === 'function') {
				isolatedGun.off(); // Remove all listeners
			}
		} catch (error) {
			// Silently handle cleanup errors
		}
	}

	// Get node props using targeted approach
	async getNodeProps(room, nodeId) {
		try {
			console.log(
				'🔍 GunDBWrapper: Starting getNodeProps for room:',
				room,
				'nodeId:',
				nodeId
			);
			const nodeRef = this.connection.gun
				.get('graphs')
				.get(room)
				.get('nodes')
				.get(nodeId)
				.get('props');

			console.log(
				'🔍 GunDBWrapper: Created node ref, waiting for data...'
			);

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					console.log(
						'⚠️ GunDBWrapper: Node props timeout for:',
						nodeId
					);
					reject(new Error('Node props timeout'));
				}, 2000);

				// Use a one-time listener that immediately removes itself
				nodeRef.once((data) => {
					clearTimeout(timeout);
					console.log(
						'🔍 GunDBWrapper: RAW NODE DATA from GunDB:',
						data
					);
					console.log(
						'🔍 GunDBWrapper: Data type:',
						typeof data,
						'Data keys:',
						data ? Object.keys(data) : 'null'
					);
					if (data && data !== 'undefined') {
						const cleanProps = this.cleanPropsData(data);
						console.log(
							'✅ GunDBWrapper: Cleaned node props:',
							cleanProps
						);
						resolve(cleanProps);
					} else {
						console.log(
							'⚠️ GunDBWrapper: No node props data found'
						);
						resolve({});
					}
				});
			});
		} catch (error) {
			console.log(
				'❌ GunDBWrapper: Error in getNodeProps:',
				error.message
			);
			throw new Error(`Node props failed: ${error.message}`);
		}
	}

	/**
	 * Get ONLY the props for an edge without triggering sync events
	 * This method is isolated and won't interfere with graph sync
	 */
	async getEdgeProps(room, edgeId) {
		try {
			console.log(
				'🔍 GunDBWrapper: Starting getEdgeProps for room:',
				room,
				'edgeId:',
				edgeId
			);
			const edgeRef = this.connection.gun
				.get('graphs')
				.get(room)
				.get('edges')
				.get(edgeId)
				.get('props');

			console.log(
				'🔍 GunDBWrapper: Created edge ref, waiting for data...'
			);

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Edge props timeout'));
				}, 2000);

				// Use a one-time listener that immediately removes itself
				edgeRef.once((data) => {
					clearTimeout(timeout);
					console.log(
						'🔍 GunDBWrapper: RAW EDGE DATA from GunDB:',
						data
					);
					console.log(
						'🔍 GunDBWrapper: Edge data type:',
						typeof data,
						'Edge data keys:',
						data ? Object.keys(data) : 'null'
					);
					if (data && data !== 'undefined') {
						const cleanProps = this.cleanPropsData(data);
						resolve(cleanProps);
					} else {
						resolve({});
					}
				});
			});
		} catch (error) {
			throw new Error(`Edge props failed: ${error.message}`);
		}
	}

	/**
	 * Fallback method: Get props using a minimal, non-interfering approach
	 * This is a simpler alternative if the isolated instance approach has issues
	 */
	async getPropsFallback(room, elementId, isNode = true) {
		try {
			const baseRef = this.connection.gun
				.get('graphs')
				.get(room)
				.get(isNode ? 'nodes' : 'edges')
				.get(elementId);

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Fallback props timeout'));
				}, 2000);

				baseRef.once((data) => {
					clearTimeout(timeout);
					if (data && data !== 'undefined') {
						const cleanProps = this.cleanPropsData(data);
						resolve(cleanProps);
					} else {
						resolve({});
					}
				});
			});
		} catch (error) {
			throw new Error(`Fallback props failed: ${error.message}`);
		}
	}

	/**
	 * Clean node data by removing GunDB metadata and extracting clean props
	 */
	cleanNodeData(nodeData) {
		if (!nodeData || typeof nodeData !== 'object') {
			return null;
		}

		// Extract clean props from the node data
		const cleanProps = this.extractCleanProps(nodeData.props);

		// Return clean node data
		return {
			id: nodeData.id,
			nid: nodeData.id, // Keep both for compatibility
			label: nodeData.label || '',
			props: cleanProps,
			by: nodeData.by || 'anon',
			updatedAt: nodeData.updatedAt || 0,
		};
	}

	/**
	 * Clean edge data by removing GunDB metadata and extracting clean props
	 */
	cleanEdgeData(edgeData) {
		if (!edgeData || typeof edgeData !== 'object') {
			return null;
		}

		// Extract clean props from the edge data
		const cleanProps = this.extractCleanProps(edgeData.props);

		// Return clean edge data
		return {
			id: edgeData.id,
			eid: edgeData.id, // Keep both for compatibility
			from: edgeData.from || edgeData.source,
			to: edgeData.to || edgeData.target,
			label: edgeData.label || '',
			direction: edgeData.direction || 'both', // Default to 'both' instead of 'forward'
			props: cleanProps,
			by: edgeData.by || 'anon',
			updatedAt: edgeData.updatedAt || 0,
		};
	}

	/**
	 * Extract clean props from GunDB's complex structure
	 * This handles the @, #, >, $, VIA, seen metadata
	 */
	extractCleanProps(propsData) {
		if (!propsData || typeof propsData !== 'object') {
			return {};
		}

		const cleanProps = {};

		// If propsData has a 'put' key, that's where the actual props are stored
		if (propsData.put && typeof propsData.put === 'object') {
			Object.keys(propsData.put).forEach((key) => {
				// Filter out GunDB metadata keys
				if (!this.isGunDBMetadata(key)) {
					cleanProps[key] = propsData.put[key];
				}
			});
		}

		// Also check for props stored directly in the propsData object
		Object.keys(propsData).forEach((key) => {
			// Filter out GunDB metadata keys
			if (!this.isGunDBMetadata(key)) {
				cleanProps[key] = propsData[key];
			}
		});

		return cleanProps;
	}

	/**
	 * Check if a key is GunDB internal metadata
	 */
	isGunDBMetadata(key) {
		const metadataKeys = [
			'$',
			'VIA',
			'seen',
			'get',
			'put',
			'@',
			'#',
			'>',
			'ok',
			'_',
			'$$',
		];
		return metadataKeys.includes(key);
	}

	/**
	 * Create or update a node
	 */
	async upsertNode(room, nodeData) {
		return new Promise((resolve) => {
			const gun = this.connection.gun;
			const nodeRef = gun
				.get('graphs')
				.get(room)
				.get('nodes')
				.get(nodeData.id);

			// Clean the node data before storing
			const cleanNodeData = {
				id: nodeData.id,
				label: nodeData.label || '',
				props: nodeData.props || {},
				updatedAt: Date.now(),
				by: nodeData.by || 'anon',
			};

			nodeRef.put(cleanNodeData, (ack) => {
				if (ack.err) {
					resolve({ success: false, error: ack.err });
				} else {
					resolve({ success: true, data: cleanNodeData });
				}
			});
		});
	}

	/**
	 * Create or update an edge
	 */
	async upsertEdge(room, edgeData) {
		return new Promise((resolve) => {
			const gun = this.connection.gun;
			const edgeRef = gun
				.get('graphs')
				.get(room)
				.get('edges')
				.get(edgeData.id);

			// Clean the edge data before storing
			const cleanEdgeData = {
				id: edgeData.id,
				from: edgeData.from,
				to: edgeData.to,
				label: edgeData.label || '',
				direction: edgeData.direction || 'forward',
				props: edgeData.props || {},
				updatedAt: Date.now(),
				by: edgeData.by || 'anon',
			};

			edgeRef.put(cleanEdgeData, (ack) => {
				if (ack.err) {
					resolve({ success: false, error: ack.err });
				} else {
					resolve({ success: true, data: cleanEdgeData });
				}
			});
		});
	}

	// Clean props data by filtering out metadata keys
	cleanPropsData(propsData) {
		if (!propsData || typeof propsData !== 'object') {
			return {};
		}

		const cleanProps = {};
		const metadataKeys = ['_', '#', '>', 'gun', 'put', 'get', 'on', 'off'];

		for (const [key, value] of Object.entries(propsData)) {
			// Skip metadata keys
			if (metadataKeys.includes(key)) {
				continue;
			}

			// Add valid props
			cleanProps[key] = value;
		}

		return cleanProps;
	}

	/**
	 * Run comprehensive network discovery queries
	 * Logs results to console for debugging and exploration
	 */
	async runNetworkDiscovery() {
		console.log('🔍 === NETWORK DISCOVERY STARTED ===');
		console.log('⏰ Timestamp:', new Date().toISOString());

		// 1. Query each peer for common discovery endpoints
		// await this.queryPeerEndpoints();

		// 2. Query GunDB for common catalog patterns
		await this.queryGunCatalogs();

		// 3. Query for active rooms/graphs
		await this.queryActiveRooms();

		// 4. Query for users and persistence
		await this.queryUsers();

		// 5. Query for persistence patterns
		await this.queryPersistencePatterns();

		// 6. Query for app namespaces
		await this.queryNamespaces();

		// 7. Network statistics
		this.logNetworkStats();

		console.log('✅ === NETWORK DISCOVERY COMPLETED ===');
	}

	async queryPeerEndpoints() {
		const gun = this.connection.gun;
		const peers = gun.back('opt.peers') || {};
		const peerUrls = Object.keys(peers);

		// Filter out self-peers
		const externalPeers = peerUrls.filter((url) => !this.isSelfPeer(url));
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

	async queryGunCatalogs() {
		console.log('\n📚 Querying GunDB catalogs...');

		const gun = this.connection.gun;
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

	async queryActiveRooms() {
		console.log('\n🏠 Querying active rooms...');

		const gun = this.connection.gun;

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

	async queryUsers() {
		console.log('\n👥 Querying for users...');

		const gun = this.connection.gun;

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

	async queryPersistencePatterns() {
		console.log('\n💾 Querying persistence patterns...');

		const gun = this.connection.gun;

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
							console.log(
								`  💿 ${query}:`,
								keys.length,
								'entries'
							);
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
						totalSize +=
							(key.length + (value ? value.length : 0)) * 2; // Rough byte estimate
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

	async queryNamespaces() {
		console.log('\n🏷️ Querying app namespaces...');

		const gun = this.connection.gun;

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
					console.log(
						'  ℹ️ No common app namespaces found with data'
					);
				}
			}, 2000);
		}, 1000);
	}

	logNetworkStats() {
		console.log('\n📊 Network Statistics:');

		const gun = this.connection.gun;
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
			`  💾 localStorage enabled: ${
				gun.back('opt.localStorage') || false
			}`
		);
		console.log(
			`  🔄 Multicast enabled: ${gun.back('opt.multicast') || false}`
		);
		console.log(`  📞 WebRTC enabled: ${gun.back('opt.webrtc') || false}`);
	}

	/**
	 * Check if a peer URL refers to the current instance (self)
	 */
	isSelfPeer(peerUrl) {
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
}
