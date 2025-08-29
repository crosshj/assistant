import { GunDBWrapper } from '../lib/gunWrapper.js';

/**
 * Event Coordinator
 * Listens to UI events and coordinates between services and StateManager
 */
export class EventCoordinator {
	constructor(connection, auth, rooms, stateManager, sync) {
		this.connection = connection;
		this.auth = auth;
		this.rooms = rooms;
		this.stateManager = stateManager;
		this.sync = sync;
		this.gunWrapper = new GunDBWrapper(connection);

		// Callback for when room selection mode should be shown
		this.onShowRoomSelection = null;

		// Track previous connection state to detect real changes
		this.previousConnectionState = null;

		// Listen to UI events from Header
		this.setupUIEventListeners();

		// Listen to service events
		this.setupServiceEventListeners();
	}

	setupUIEventListeners() {
		// Listen for custom UI events
		document.addEventListener('ui:connect', () => this.handleConnect());
		document.addEventListener('ui:disconnect', () =>
			this.handleDisconnect()
		);
		document.addEventListener('ui:testConnection', () =>
			this.handleTestConnection()
		);
		document.addEventListener('ui:createIdentity', (e) =>
			this.handleCreateIdentity(e.detail)
		);
		document.addEventListener('ui:login', (e) =>
			this.handleLogin(e.detail)
		);
	}

	setupServiceEventListeners() {
		// Listen to connection service events
		this.connection.on('connectionStatusChanged', (data) => {
			this.onConnectionStatusChanged(data);
		});

		this.connection.on('userLoggedIn', (data) => {
			this.onUserAuthenticated(data.alias);
		});
	}

	// ===== NETWORK EVENTS =====

	handleConnect() {
		// Update state to connecting
		this.stateManager.setNetworkConnecting();

		// Call connection service
		const peers = this.connection.getDefaultPeers();
		this.connection.updatePeers(peers);
	}

	handleDisconnect() {
		// Call connection service first
		this.connection.disconnect();

		// Then update state
		this.stateManager.setNetworkManuallyDisconnected();
	}

	handleTestConnection() {
		this.connection.testConnection();
	}

	// ===== AUTH EVENTS =====
	handleCreateIdentity(alias) {
		this.auth.createIdentity(alias);
	}

	handleLogin(credentials) {
		this.auth.login(credentials.alias, credentials.password);
	}

	handleLogout() {
		this.auth.logout();
	}

	handleUserAuthenticated(alias) {
		// Update state to reflect authentication
		if (this.stateManager) {
			this.stateManager.setUserAuthenticated(alias);
		}
	}

	handleUserLoggedOut() {
		// Update state to reflect logout
		if (this.stateManager) {
			this.stateManager.setUserLoggedOut();
		}
	}

	// ===== SERVICE EVENT HANDLERS =====
	// These are called by services to update state

	onConnectionStatusChanged(data) {
		const connected = typeof data === 'object' ? data.connected : data;
		const total = typeof data === 'object' ? data.total : arguments[1];

		// Create current state object for comparison
		const currentState = {
			connected,
			total,
			status: typeof data === 'object' ? data.status : 'connected',
			hash: window.location.hash,
			roomsInRoom: this.rooms ? this.rooms.isInRoom() : false,
		};

		// Check if state has actually changed
		const stateChanged =
			!this.previousConnectionState ||
			JSON.stringify(this.previousConnectionState) !==
				JSON.stringify(currentState);

		// Only proceed if state has actually changed
		if (stateChanged) {
			this.stateManager.setNetworkConnected(connected, total);

			// Don't manage UI mode here - let the Room component handle its own UI
			// based on state changes. Only handle auto-join logic.
			if (connected && this.rooms && !this.rooms.isInRoom()) {
				// Check if there's a hash tag that would indicate auto-join
				if (!this.shouldShowRoomSelector()) {
					// Auto-join the room specified in the hash
					this.handleAutoJoinFromHash();
				} else {
					// No auto-join, fire room:left event to show room selection
					document.dispatchEvent(new CustomEvent('room:left'));
				}
			}

			// Update previous state
			this.previousConnectionState = currentState;
		}
	}

	// Handle auto-join from hash tag when connection is established
	handleAutoJoinFromHash() {
		const hash = window.location.hash;
		if (hash && hash.length > 1) {
			const roomName = hash.substring(1); // Remove the # character

			// Small delay to ensure everything is ready
			setTimeout(() => {
				if (this.rooms && this.connection.isConnected()) {
					this.rooms.joinRoom(roomName, this.connection);
				}
			}, 500);
		}
	}

	// Check if we should show the room selector (no hash tag)
	shouldShowRoomSelector() {
		return !window.location.hash || window.location.hash.length <= 1;
	}

	onRoomStatusChanged(status, roomName) {
		// Room status changes are now handled by RoomController
		// This method is kept for backward compatibility but no longer handles room logic
	}

	onUserAuthenticated(alias) {
		this.stateManager.setAuthAuthenticated(alias);
	}
}
