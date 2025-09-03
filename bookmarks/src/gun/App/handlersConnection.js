import { dispatchEvent, log, uuid, tryJSONParse } from '../_lib/utils.js';
import { GunDBWrapper } from '../_lib/gunWrapper.js';

/**
 * Connection handlers - handles all connection-related events
 * Only dispatches events and interacts with appController.gun
 * Returns bound methods for AppController to use
 */
export function getHandlers(appController) {
	// Internal methods (not exported as events)
	function getDefaultPeers() {
		// TODO: Move from services/connection.js getDefaultPeers()
	}

	function createIsolatedInstance() {
		// TODO: Move from services/connection.js createIsolatedInstance()
	}

	function monitorConnections() {
		// TODO: Move from services/connection.js monitorConnections()
	}

	function updateConnectionStatusFromPeers() {
		// TODO: Move from services/connection.js updateConnectionStatusFromPeers()
	}

	function updateConnectionStatus(connected, total) {
		// TODO: Move from services/connection.js updateConnectionStatus()
	}

	function getDetailedPeerInfo() {
		if (!appController.rawGun) {
			return {};
		}

		const peers = appController.rawGun.back('opt.peers') || {};
		const detailedPeers = {};

		Object.entries(peers).forEach(([peerId, peer]) => {
			if (!peer) return;

			// Note: We don't have peerStability tracking in AppController yet
			// This will need to be added when we move monitoring logic
			const isConnected = peer.wire && peer.wire.readyState === 1;

			detailedPeers[peerId] = {
				id: peer.id || peerId,
				url: peer.url || 'Unknown',
				wire: peer.wire,
				readyState: peer.wire ? peer.wire.readyState : null,
				isConnected,
				stability: {
					connected: isConnected,
					stableSince: null, // TODO: Add when monitoring is moved
					stableTime: 0,
					stable: isConnected, // Simplified for now
				},
				lastActivity: {
					connected: isConnected ? Date.now() : null,
					disconnected: !isConnected ? Date.now() : null,
				},
				metadata: {
					pid: peer.pid,
					opt: peer.opt,
				},
			};
		});

		return detailedPeers;
	}

	function getNetworkInfo() {
		if (!appController.rawGun) {
			return {
				totalPeers: 0,
				connectedPeers: 0,
				stablePeers: 0,
				connectionRate: 0,
				gunOptions: {},
				networkStatus: 'disconnected',
			};
		}

		const peers = appController.rawGun.back('opt.peers') || {};
		const peerEntries = Object.entries(peers);
		const totalPeers = peerEntries.length;

		let connectedPeers = 0;
		let stablePeers = 0;

		peerEntries.forEach(([peerId, peer]) => {
			if (peer && peer.wire && peer.wire.readyState === 1) {
				connectedPeers++;

				// Note: We don't have peerStability tracking in AppController yet
				// This will need to be added when we move monitoring logic
				stablePeers = connectedPeers; // Simplified for now
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
			gunOptions: appController.rawGun.back('opt') || {},
			networkStatus,
			isDisconnected: false, // TODO: Track this in AppController
			defaultPeers: appController.defaultPeers,
			currentPeers: getCurrentPeers(),
		};
	}

	function getCurrentPeers() {
		// Get current peers from the raw Gun instance
		if (!appController.rawGun) {
			return [];
		}
		const peers = appController.rawGun.back('opt.peers') || {};
		return Object.values(peers)
			.map((peer) => peer?.url)
			.filter(Boolean);
	}

	function login(alias, pass) {
		if (!alias || !pass) {
			log('set alias or create identity');
			return;
		}

		appController.user.auth(alias, pass, ({ err }) => {
			if (err) {
				log('auth error ' + err);
			} else {
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

	function isConnected() {
		// TODO: Move from services/connection.js isConnected()
	}

	function startMonitoring() {
		// Initialize connection status tracking
		appController.connectionStatus = { connected: 0, total: 0 };
		appController.isDisconnected = false;
		appController.previousConnectionState = null;
		appController.peerStability = new Map();

		// Use GunDB's built-in connection events
		appController.rawGun.on('hi', (peer) => {
			const peerUrl = peer.url || 'unknown';

			// Mark peer as connected and start stability timer
			appController.peerStability.set(peerUrl, {
				connected: true,
				stableSince: Date.now(),
			});

			// Update connection status immediately for connections
			updateConnectionStatusFromPeers();
		});

		appController.rawGun.on('bye', (peer) => {
			const peerUrl = peer.url || 'unknown';

			// Mark peer as disconnected
			appController.peerStability.set(peerUrl, {
				connected: false,
				stableSince: Date.now(),
			});

			// Update connection status immediately for disconnections
			updateConnectionStatusFromPeers();
		});

		// Handle connection errors
		appController.rawGun.on('error', (error) => {
			// Don't log connection errors - too noisy
		});

		// Initial connection status check - delay to allow UI to show "Connecting..." first
		setTimeout(() => {
			updateConnectionStatusFromPeers();
		}, 1000);

		// Also set up periodic connection checking as a fallback
		setInterval(() => {
			updateConnectionStatusFromPeers();
		}, 2000);
	}

	function updateConnectionStatusFromPeers() {
		if (!appController.rawGun || appController.isDisconnected) return;

		const peers = appController.rawGun.back('opt.peers') || {};
		const peerCount = Object.keys(peers).length;

		// Count stable connected peers
		const stableConnectedPeers = Object.values(peers).filter((peer) => {
			if (
				!peer ||
				!peer.url ||
				!peer.wire ||
				peer.wire.readyState !== 1
			) {
				return false;
			}

			// Check if peer has been stable for at least 100ms
			const stability = appController.peerStability.get(peer.url);
			if (!stability || !stability.connected) {
				return false;
			}

			const stableTime = Date.now() - stability.stableSince;
			return stableTime >= 100;
		}).length;

		// Fallback - count peers with immediate WebSocket readyState check
		const immediateConnectedPeers = Object.values(peers).filter((peer) => {
			return peer && peer.url && peer.wire && peer.wire.readyState === 1;
		}).length;

		// Use the higher count between the two methods
		const connectedPeers = Math.max(
			stableConnectedPeers,
			immediateConnectedPeers
		);

		updateConnectionStatus(connectedPeers, peerCount);
	}

	function updateConnectionStatus(connected, total) {
		appController.connectionStatus = { connected, total };

		// Create current state object for comparison
		const currentState = {
			connected,
			total,
			status: connected > 0 ? 'connected' : 'connecting',
			hash: window.location.hash,
			roomsInRoom: false, // This will be updated by room service if needed
		};

		// Check if state has actually changed
		const stateChanged =
			!appController.previousConnectionState ||
			JSON.stringify(appController.previousConnectionState) !==
				JSON.stringify(currentState);

		// Only proceed if state has actually changed
		if (stateChanged) {
			// Update state via event
			dispatchEvent('network:connected', { connected, total });

			// Handle auto-join logic if connected and not in room
			if (connected && !isInRoom()) {
				// Check if there's a hash tag that would indicate auto-join
				if (!shouldShowRoomSelector()) {
					// Auto-join the room specified in the hash
					handleAutoJoinFromHash();
				} else {
					// No auto-join, fire room:left event to show room selection
					dispatchEvent('room:left');
				}
			}

			// Update previous state
			appController.previousConnectionState = currentState;
		}
	}

	function shouldShowRoomSelector() {
		return !window.location.hash || window.location.hash.length <= 1;
	}

	function isInRoom() {
		// This is a placeholder - the room service should update this
		// For now, return false to allow auto-join logic to work
		return false;
	}

	function handleAutoJoinFromHash() {
		const hash = window.location.hash;
		if (hash && hash.length > 1) {
			const roomName = hash.substring(1); // Remove the # character

			// Small delay to ensure everything is ready
			setTimeout(() => {
				if (isConnected()) {
					// Dispatch event for room service to handle
					dispatchEvent('ui:joinRoom', roomName);
				}
			}, 500);
		}
	}

	function isConnected() {
		return appController.connectionStatus.connected > 0;
	}

	function autoLogin() {
		// Handle auth auto-login
		const saved = tryJSONParse(localStorage.getItem('gun_demo_creds'));
		if (saved) {
			appController.user.auth(saved.alias, saved.pass, ({ err }) => {
				if (err) {
					log('auth error ' + err);
				} else {
					// Update state via event instead of direct call
					dispatchEvent('auth:authenticated', { alias: saved.alias });
				}
			});
		}
	}

	return {
		discovery(event) {
			// Use GunDBWrapper instance from AppController
			appController.gun.runNetworkDiscovery();
		},

		connect(event) {
			// Update state via event instead of direct call
			dispatchEvent('network:connecting');

			// Reset disconnected flag when manually connecting
			appController.isDisconnected = false;

			// Reinitialize AppController's Gun instance with default peers
			// Note: Gun.js doesn't support dynamic peer updates, so we need to recreate
			const Gun = appController.rawGun.constructor; // Get Gun constructor

			appController.rawGun = Gun({
				peers: appController.defaultPeers,
				localStorage: true,
				multicast: true,
				webrtc: true,
				retry: 3,
				timeout: 5000,
			});

			// Update GunDBWrapper with new Gun instance
			appController.gun = new GunDBWrapper({ gun: appController.rawGun });

			// Reinitialize user for authentication
			appController.user = appController.rawGun.user();
		},

		disconnect(event) {
			// Set disconnected flag to prevent automatic reconnection
			appController.isDisconnected = true;

			// Close all peer connections using AppController's raw Gun instance
			if (appController.rawGun) {
				const peers = appController.rawGun.back('opt.peers') || {};
				Object.values(peers).forEach((peer) => {
					if (peer && peer.wire) {
						peer.wire.close();
					}
				});
			}

			// Reset connection status
			appController.connectionStatus = { connected: 0, total: 0 };

			// Dispatch state update event
			dispatchEvent('network:disconnected');
		},

		test(event) {
			// Test connection using AppController's raw Gun instance
			const peers = appController.rawGun.back('opt.peers') || {};
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
				log(`❌ No peers connected.`);
			} else {
				log('✅ Connection looks good! Graph operations should work.');
			}

			// Update connection status (we'll need to implement this in AppController)
			// TODO: Add connection status tracking to AppController
		},

		identityCreate(event) {
			const alias = event.detail || null;
			const userAlias = alias || `u_${uuid().slice(0, 6)}`;
			const pass = crypto.getRandomValues(new Uint8Array(16)).join('');

			appController.user.create(userAlias, pass, (ack) => {
				if (ack.err) {
					log('create error ' + ack.err);
					return;
				}

				// Auto-login after creating identity
				login(userAlias, pass);
			});
		},

		login(event) {
			// Current UI flow only provides alias, so use createIdentity
			// This will create a new identity or use existing one
			const credentials = event.detail;
			const alias = credentials.alias || credentials;

			const userAlias = alias || `u_${uuid().slice(0, 6)}`;
			const pass = crypto.getRandomValues(new Uint8Array(16)).join('');

			appController.user.create(userAlias, pass, (ack) => {
				if (ack.err) {
					log('create error ' + ack.err);
					return;
				}

				// Auto-login after creating identity
				login(userAlias, pass);
			});
		},

		info(event) {
			// Gather all network info and dispatch consolidated response
			const detailedPeerInfo = getDetailedPeerInfo();
			const networkInfo = getNetworkInfo();
			const defaultPeers = appController.defaultPeers;
			const currentPeers = getCurrentPeers();

			// Dispatch consolidated response
			dispatchEvent('network:infoResponse', {
				detailedPeerInfo,
				networkInfo,
				defaultPeers,
				currentPeers,
			});
		},

		startMonitoring() {
			startMonitoring();
		},

		autoLogin() {
			autoLogin();
		},
	};
}
