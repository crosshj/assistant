import Gun from 'gun';
import 'gun/sea';
import 'gun/axe';
import {
	log,
	uuid,
	dispatchEvent,
	tryJSONParse,
	addEventListener,
} from '../lib/utils.js';

// GunDB Connection Management
export class ConnectionService {
	constructor() {
		this.gun = null;
		this.user = null;
		this.peers = [];
		this.connectionStatus = { connected: 0, total: 0 };
		this.monitoringInterval = null;
		this.isDisconnected = false; // Flag to track manual disconnection

		// Track previous connection state to detect real changes (moved from EventCoordinator)
		this.previousConnectionState = null;
	}

	// Authentication methods
	createIdentity(alias = null) {
		const userAlias = alias || `u_${uuid().slice(0, 6)}`;
		const pass = crypto.getRandomValues(new Uint8Array(16)).join('');

		this.user.create(userAlias, pass, (ack) => {
			if (ack.err) {
				log('create error ' + ack.err);
				return;
			}

			this.login(userAlias, pass);
		});
	}

	login(alias, pass) {
		if (!alias || !pass) {
			log('set alias or create identity');
			return;
		}

		this.user.auth(alias, pass, ({ err }) => {
			if (err) {
				log('auth error ' + err);
			} else {
				// log('logged in as ' + alias);

				// Update state via event instead of direct call
				dispatchEvent('auth:authenticated', { alias });

				// Save credentials for auto-login
				localStorage.setItem(
					'gun_demo_creds',
					JSON.stringify({ alias, pass })
				);
			}
		});
	}

	getCurrentUser() {
		return this.user.is ? this.user.is.alias : 'anon';
	}

	isAuthenticated() {
		return !!this.user.is;
	}

	logout() {
		this.user.leave();
		log('logged out');

		// Update state via event instead of direct call
		dispatchEvent('auth:anonymous');
	}

	// Note: DOM events are used for external listeners; no custom bus

	init(peers = []) {
		this.peers = peers.length ? peers : this.getDefaultPeers();

		this.gun = Gun({
			peers: this.peers,
			localStorage: true,
			multicast: true, // + Local network discovery
			webrtc: true, // + Direct P2P connections
			retry: 3, // Retry failed connections
			timeout: 5000, // 5 second timeout
		});

		this.user = this.gun.user();
		this.autoLogin();
		this.setupEventListeners();

		// Don't log connection messages - too noisy
		// log(
		// 	'gun init with ' +
		// 		Object.keys(this.gun.back('opt.peers') || {}).length +
		// 		' peers'
		// );

		// Emit initial connecting state
		dispatchEvent('network:connecting');

		// Set initial connection status without emitting network:connected event
		this.connectionStatus = { connected: 0, total: 0 };

		return this.gun;
	}

	setupEventListeners() {
		// Listen for network discovery requests
		addEventListener('networkDiscovery', () => {
			this.handleNetworkDiscovery();
		});

		// Listen for UI events that EventCoordinator currently handles
		addEventListener('ui:connect', () => this.handleConnect());
		addEventListener('ui:disconnect', () => this.handleDisconnect());
		addEventListener('ui:testConnection', () =>
			this.handleTestConnection()
		);
		addEventListener('ui:createIdentity', (e) =>
			this.handleCreateIdentity(e.detail)
		);
		addEventListener('ui:login', (e) => this.handleLogin(e.detail));
	}

	handleNetworkDiscovery() {
		// Import gunWrapper dynamically to avoid circular dependency
		import('../lib/gunWrapper.js').then(({ GunDBWrapper }) => {
			const gunWrapper = new GunDBWrapper(this);
			gunWrapper.runNetworkDiscovery();
		});
	}

	// ===== UI EVENT HANDLERS (moved from EventCoordinator) =====

	handleConnect() {
		// Update state via event instead of direct call
		dispatchEvent('network:connecting');

		// Call connection service
		const peers = this.getDefaultPeers();
		this.updatePeers(peers);
	}

	handleDisconnect() {
		// Call connection service first
		this.disconnect();

		// Then update state via event instead of direct call
		dispatchEvent('network:disconnected');
	}

	handleTestConnection() {
		this.testConnection();
	}

	handleCreateIdentity(alias) {
		this.createIdentity(alias);
	}

	handleLogin(credentials) {
		// Current UI flow only provides alias, so use createIdentity
		// This will create a new identity or use existing one
		this.createIdentity(credentials.alias || credentials);
	}

	// ===== ROOM AUTO-JOIN LOGIC (moved from EventCoordinator) =====

	// Handle auto-join from hash tag when connection is established
	handleAutoJoinFromHash() {
		const hash = window.location.hash;
		if (hash && hash.length > 1) {
			const roomName = hash.substring(1); // Remove the # character

			// Small delay to ensure everything is ready
			setTimeout(() => {
				if (this.isConnected()) {
					// Dispatch event for room service to handle
					dispatchEvent('ui:joinRoom', roomName);
				}
			}, 500);
		}
	}

	// Check if we should show the room selector (no hash tag)
	shouldShowRoomSelector() {
		return !window.location.hash || window.location.hash.length <= 1;
	}

	// Check if currently in a room (placeholder - will be updated by room service)
	isInRoom() {
		// This is a placeholder - the room service should update this
		// For now, return false to allow auto-join logic to work
		return false;
	}

	startMonitoring() {
		this.monitorConnections();
	}

	getDefaultPeers() {
		return [
			'https://gun-us.herokuapp.com/gun',
			'https://gun-eu.herokuapp.com/gun',
			'https://gunjs.herokuapp.com/gun',
		];
	}

	/**
	 * Create an isolated GunDB instance for operations that shouldn't interfere with main sync
	 * This is useful for one-time reads like props fetching
	 */
	createIsolatedInstance() {
		return Gun({
			peers: this.peers,
			localStorage: false, // Don't persist isolated operations
			retry: 1, // Minimal retry for isolated ops
			timeout: 3000, // Shorter timeout for isolated ops
		});
	}

	autoLogin() {
		// Handle auth auto-login
		const saved = tryJSONParse(localStorage.getItem('gun_demo_creds'));
		if (saved) {
			this.user.auth(saved.alias, saved.pass, ({ err }) => {
				if (err) {
					log('auth error ' + err);
				} else {
					// log('logged in as ' + saved.alias);

					// Update state via event instead of direct call
					dispatchEvent('auth:authenticated', { alias: saved.alias });
				}
			});
		}
	}

	monitorConnections() {
		// Clear any existing monitoring interval
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
		}

		// Track peer stability to avoid rapid connect/disconnect cycles
		this.peerStability = new Map(); // peer.url -> { connected: boolean, stableSince: timestamp }

		// Use GunDB's built-in connection events instead of manual polling
		this.gun.on('hi', (peer) => {
			const peerUrl = peer.url || 'unknown';

			// Mark peer as connected and start stability timer
			this.peerStability.set(peerUrl, {
				connected: true,
				stableSince: Date.now(),
			});

			// Update connection status immediately for connections (no stability delay)
			this.updateConnectionStatusFromPeers();
		});

		this.gun.on('bye', (peer) => {
			const peerUrl = peer.url || 'unknown';

			// Only log disconnections for peers that were actually stable
			const stability = this.peerStability.get(peerUrl);
			if (stability && stability.connected) {
				const stableTime = Date.now() - stability.stableSince;
				if (stableTime >= 500) {
					// Don't log peer disconnections - too noisy
					// log(`🔌 Peer disconnected: ${peerUrl}`);
				}
			}

			// Mark peer as disconnected
			this.peerStability.set(peerUrl, {
				connected: false,
				stableSince: Date.now(),
			});

			// Update connection status immediately for disconnections
			this.updateConnectionStatusFromPeers();
		});

		// Handle connection errors
		this.gun.on('error', (error) => {
			// Don't log connection errors - too noisy
			// log(`❌ Gun.js connection error: ${error.message || error}`);
		});

		// Initial connection status check - delay to allow UI to show "Connecting..." first
		setTimeout(() => {
			this.updateConnectionStatusFromPeers();
		}, 1000); // 1 second delay to show "Connecting..." state

		// Also set up periodic connection checking as a fallback
		setInterval(() => {
			this.updateConnectionStatusFromPeers();
		}, 2000); // Check every 2 seconds as fallback
	}

	updateConnectionStatusFromPeers() {
		if (!this.gun || this.isDisconnected) return;

		const peers = this.gun.back('opt.peers') || {};
		const peerCount = Object.keys(peers).length;

		// Method 1: Count peers using stability logic (reduced requirements)
		const stableConnectedPeers = Object.values(peers).filter((peer) => {
			if (
				!peer ||
				!peer.url ||
				!peer.wire ||
				peer.wire.readyState !== 1
			) {
				return false;
			}

			// Check if peer has been stable for at least 100ms (reduced from 500ms)
			const stability = this.peerStability.get(peer.url);
			if (!stability || !stability.connected) {
				return false;
			}

			const stableTime = Date.now() - stability.stableSince;
			return stableTime >= 100; // Reduced from 500ms to 100ms
		}).length;

		// Method 2: Fallback - count peers with immediate WebSocket readyState check
		const immediateConnectedPeers = Object.values(peers).filter((peer) => {
			return peer && peer.url && peer.wire && peer.wire.readyState === 1;
		}).length;

		// Use the higher count between the two methods
		const connectedPeers = Math.max(
			stableConnectedPeers,
			immediateConnectedPeers
		);

		this.updateConnectionStatus(connectedPeers, peerCount);
	}

	updateConnectionStatus(connected, total) {
		this.connectionStatus = { connected, total };

		// Create current state object for comparison (moved from EventCoordinator)
		const currentState = {
			connected,
			total,
			status: connected > 0 ? 'connected' : 'connecting',
			hash: window.location.hash,
			roomsInRoom: false, // This will be updated by room service if needed
		};

		// Check if state has actually changed (moved from EventCoordinator)
		const stateChanged =
			!this.previousConnectionState ||
			JSON.stringify(this.previousConnectionState) !==
				JSON.stringify(currentState);

		// Only proceed if state has actually changed
		if (stateChanged) {
			// Update state via event instead of direct call
			dispatchEvent('network:connected', { connected, total });

			// Handle auto-join logic if connected and not in room
			if (connected && !this.isInRoom()) {
				// Check if there's a hash tag that would indicate auto-join
				if (!this.shouldShowRoomSelector()) {
					// Auto-join the room specified in the hash
					this.handleAutoJoinFromHash();
				} else {
					// No auto-join, fire room:left event to show room selection
					dispatchEvent('room:left');
				}
			}

			// Update previous state
			this.previousConnectionState = currentState;
		}
	}

	getConnectionStatus() {
		return this.connectionStatus;
	}

	/**
	 * Get detailed information about all peers
	 * @returns {Object} Detailed peer information
	 */
	getDetailedPeerInfo() {
		if (!this.gun) {
			return {};
		}

		const peers = this.gun.back('opt.peers') || {};
		const detailedPeers = {};

		Object.entries(peers).forEach(([peerId, peer]) => {
			if (!peer) return;

			const stability = this.peerStability.get(peer.url) || {};
			const isConnected = peer.wire && peer.wire.readyState === 1;
			const stableTime = stability.connected
				? Date.now() - stability.stableSince
				: 0;

			detailedPeers[peerId] = {
				id: peer.id || peerId,
				url: peer.url || 'Unknown',
				wire: peer.wire,
				readyState: peer.wire ? peer.wire.readyState : null,
				isConnected,
				stability: {
					connected: stability.connected || false,
					stableSince: stability.stableSince || null,
					stableTime,
					stable: stableTime >= 100, // Consider stable after 100ms
				},
				lastActivity: {
					connected: stability.connected
						? stability.stableSince
						: null,
					disconnected: !stability.connected
						? stability.stableSince
						: null,
				},
				metadata: {
					pid: peer.pid,
					opt: peer.opt,
				},
			};
		});

		return detailedPeers;
	}

	/**
	 * Get network-wide statistics and information
	 * @returns {Object} Network information
	 */
	getNetworkInfo() {
		if (!this.gun) {
			return {
				totalPeers: 0,
				connectedPeers: 0,
				stablePeers: 0,
				connectionRate: 0,
				gunOptions: {},
				networkStatus: 'disconnected',
			};
		}

		const peers = this.gun.back('opt.peers') || {};
		const peerEntries = Object.entries(peers);
		const totalPeers = peerEntries.length;

		let connectedPeers = 0;
		let stablePeers = 0;

		peerEntries.forEach(([peerId, peer]) => {
			if (peer && peer.wire && peer.wire.readyState === 1) {
				connectedPeers++;

				const stability = this.peerStability.get(peer.url) || {};
				const stableTime = stability.connected
					? Date.now() - stability.stableSince
					: 0;
				if (stableTime >= 100) {
					stablePeers++;
				}
			}
		});

		const connectionRate =
			totalPeers > 0 ? (connectedPeers / totalPeers) * 100 : 0;

		let networkStatus = 'disconnected';
		if (connectedPeers === totalPeers && totalPeers > 0) {
			networkStatus = 'connected';
		} else if (connectedPeers > 0) {
			networkStatus = 'partial';
		}

		return {
			totalPeers,
			connectedPeers,
			stablePeers,
			connectionRate: Math.round(connectionRate),
			gunOptions: this.gun.back('opt') || {},
			networkStatus,
			isDisconnected: this.isDisconnected,
			defaultPeers: this.getDefaultPeers(),
			currentPeers: this.peers,
		};
	}

	isConnected() {
		return this.connectionStatus.connected > 0;
	}

	testConnection() {
		const peers = this.gun.back('opt.peers') || {};
		const peerCount = Object.keys(peers).length;
		const connectedPeers = Object.values(peers).filter(
			(peer) =>
				peer && peer.url && peer.wire && peer.wire.readyState === 1
		).length;

		// Log connection test results for manual testing
		log(
			`📊 Manual Connection Check: ${connectedPeers}/${peerCount} peers connected`
		);

		if (connectedPeers === 0) {
			log(`❌ No peers connected. Try updating peer URLs.
💡 Tip: Use public GunDB peers like:
   • https://gun-manhattan.herokuapp.com/gun
   • https://gun-us.herokuapp.com/gun
   • https://gunjs.herokuapp.com/gun`);
		} else {
			log('✅ Connection looks good! Graph operations should work.');
		}

		// Update the connection status immediately
		this.updateConnectionStatus(connectedPeers, peerCount);
	}

	updatePeers(peers) {
		if (peers.length === 0) {
			// Don't log connection messages - too noisy
			// log('⚠️ Please enter at least one peer URL');
			return false;
		}

		// Reset disconnected flag when manually connecting
		this.isDisconnected = false;

		// Don't log connection messages - too noisy
		// log('🔄 Connecting to peers: ' + peers.join(', '));

		// Reinitialize with new peers (Gun.js doesn't support dynamic peer updates)
		this.init(peers);

		// Check connection status multiple times as connections establish
		const checkConnection = (attempt = 1) => {
			const currentPeers = this.gun.back('opt.peers') || {};
			const peerCount = Object.keys(currentPeers).length;
			const connectedPeers = Object.values(currentPeers).filter(
				(peer) =>
					peer && peer.url && peer.wire && peer.wire.readyState === 1
			).length;

			this.updateConnectionStatus(connectedPeers, peerCount);

			// Keep checking until all peers are connected or max attempts reached
			if (connectedPeers < peerCount && attempt < 10) {
				setTimeout(() => checkConnection(attempt + 1), 500); // Check every 500ms
			}
		};

		// Start checking after a short delay
		setTimeout(() => checkConnection(), 500);

		return true;
	}

	disconnect() {
		// Don't log connection messages - too noisy
		// log('🔄 Disconnecting from all peers...');

		// Set disconnected flag to prevent automatic reconnection
		this.isDisconnected = true;

		// Close all peer connections
		if (this.gun) {
			const peers = this.gun.back('opt.peers') || {};
			Object.values(peers).forEach((peer) => {
				if (peer && peer.wire) {
					peer.wire.close();
				}
			});
		}

		// Reset connection status
		this.connectionStatus = { connected: 0, total: 0 };
	}
}
