import Gun from 'gun';
import 'gun/sea';
import 'gun/axe';
import { log } from '../lib/utils.js';

// GunDB Connection Management
export class GunConnection {
	constructor() {
		this.gun = null;
		this.user = null;
		this.peers = [];
		this.connectionStatus = { connected: 0, total: 0 };
		this.eventListeners = new Map();
		this.monitoringInterval = null;
		this.isDisconnected = false; // Flag to track manual disconnection
	}

	// Event system for UI components to listen to
	on(event, callback) {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}
		this.eventListeners.get(event).push(callback);
	}

	emit(event, data) {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.forEach((callback) => callback(data));
		}
	}

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

		// Don't log connection messages - too noisy
		// log(
		// 	'gun init with ' +
		// 		Object.keys(this.gun.back('opt.peers') || {}).length +
		// 		' peers'
		// );

		// Emit initial connection status - start in connecting state
		this.updateConnectionStatus(0, 0);

		// Set initial status to connecting since we're trying to establish connections
		this.emit('connectionStatusChanged', {
			connected: 0,
			total: 3,
			status: 'connecting',
		});

		return this.gun;
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
		// Note: Auth autoLogin is handled by AuthManager service
		// This method is kept for backward compatibility but no longer needed
	}

	tryJSON(t, d) {
		try {
			return t ? JSON.parse(t) : d;
		} catch {
			return d;
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

		// Emit status update event for EventCoordinator to consume
		this.emit('connectionStatusChanged', {
			connected,
			total,
			status: connected > 0 ? 'connected' : 'connecting',
		});
		// Don't log connection status updates - too noisy
		// console.log('🔌 Connection service status update:', {
		// 	connected,
		// 	total,
		// 	status: connected > 0 ? 'connected' : 'connecting',
		// });
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
		this.emit('connectionStatusChanged', { connected: 0, total: 0 });

		// Don't log connection messages - too noisy
		// log('✅ Disconnected from all peers');
	}
}
