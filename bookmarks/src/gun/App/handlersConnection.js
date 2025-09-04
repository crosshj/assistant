import { dispatchEvent, log, uuid, tryJSONParse } from '../_lib/utils.js';
import { DEFAULT_PEERS } from '../_lib/gunWrapper.js';

/**
 * Connection handlers - handles all connection-related events
 * Only dispatches events and interacts with appController.gun
 * Returns bound methods for AppController to use
 */
export function getHandlers(appController) {
	function getDetailedPeerInfo() {
		if (!appController.gun) {
			return {};
		}

		return appController.gun.getDetailedPeerInfo();
	}

	function getNetworkInfo() {
		if (!appController.gun) {
			return {
				totalPeers: 0,
				connectedPeers: 0,
				stablePeers: 0,
				connectionRate: 0,
				gunOptions: {},
				networkStatus: 'disconnected',
				isDisconnected: false,
				defaultPeers: DEFAULT_PEERS,
				currentPeers: [],
			};
		}

		return appController.gun.getNetworkInfo();
	}

	function login(alias, pass) {
		if (!alias || !pass) {
			log('set alias or create identity');
			return;
		}

		const user = appController.gun.user();
		user.auth(alias, pass, ({ err }) => {
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

	function stopMonitoring() {
		// Remove event listeners
		appController.gun.off('hi');
		appController.gun.off('bye');
		appController.gun.off('error');

		// Clear any existing intervals
		if (appController.monitoringInterval) {
			clearInterval(appController.monitoringInterval);
			appController.monitoringInterval = null;
		}

		// Mark that monitoring is inactive
		appController.monitoringActive = false;
	}

	function startMonitoring() {
		// Stop existing monitoring first
		stopMonitoring();

		// Initialize connection status tracking
		appController.connectionStatus = { connected: 0, total: 0 };
		appController.isDisconnected = false;
		appController.previousConnectionState = null;
		appController.peerStability = new Map();

		// Mark that monitoring is active
		appController.monitoringActive = true;

		// Use GunDB's built-in connection events
		appController.gun.on('hi', (peer) => {
			const peerUrl = peer.url || 'unknown';

			// Mark peer as connected and start stability timer
			appController.peerStability.set(peerUrl, {
				connected: true,
				stableSince: Date.now(),
			});

			// Update connection status immediately for connections
			updateConnectionStatusFromPeers();
		});

		appController.gun.on('bye', (peer) => {
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
		appController.gun.on('error', (error) => {
			// Don't log connection errors - too noisy
		});

		// Initial connection status check - delay to allow UI to show "Connecting..." first
		setTimeout(() => {
			updateConnectionStatusFromPeers();
		}, 1000);

		// Also set up periodic connection checking as a fallback
		appController.monitoringInterval = setInterval(() => {
			updateConnectionStatusFromPeers();
		}, 2000);
	}

	function updateConnectionStatusFromPeers() {
		if (!appController.gun || appController.isDisconnected) return;

		const peers = appController.gun.getPeers();
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
			const user = appController.gun.user();
			user.auth(saved.alias, saved.pass, ({ err }) => {
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
		discovery: appController.gun.runNetworkDiscovery,

		connect(event) {
			dispatchEvent('network:connecting');
			appController.isDisconnected = false;
			appController.gun.connect();
			appController.user = appController.gun.user();
		},

		disconnect(event) {
			appController.isDisconnected = true;
			appController.gun.disconnect();
			appController.connectionStatus = { connected: 0, total: 0 };

			// Stop monitoring when disconnecting
			stopMonitoring();

			dispatchEvent('network:disconnected');
		},

		test(event) {
			const connectionInfo = appController.gun.testConnection();
			log(
				`📊 Manual Connection Check: ${connectionInfo.connectedPeers}/${connectionInfo.totalPeers} peers connected`
			);

			if (connectionInfo.connectedPeers === 0) {
				log(`❌ No peers connected.`);
			} else {
				log('✅ Connection looks good! Graph operations should work.');
			}
		},

		identityCreate(event) {
			const alias = event.detail || null;
			const userAlias = alias || `u_${uuid().slice(0, 6)}`;
			const pass = crypto.getRandomValues(new Uint8Array(16)).join('');

			const user = appController.gun.user();
			user.create(userAlias, pass, (ack) => {
				if (ack.err) {
					log('create error ' + ack.err);
					return;
				}
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

			const user = appController.gun.user();
			user.create(userAlias, pass, (ack) => {
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

			// Dispatch consolidated response with the structure the UI expects
			dispatchEvent('network:infoResponse', {
				detailedPeerInfo,
				networkInfo,
				defaultPeers: networkInfo.defaultPeers || [],
				currentPeers: networkInfo.currentPeers || [],
			});
		},

		startMonitoring,
		autoLogin,
	};
}
