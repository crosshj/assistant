import { GunDBWrapper } from '../lib/gunWrapper.js';
import { dispatchEvent } from '../lib/utils.js';

/**
 * Event Coordinator
 * Listens to UI events and coordinates between services via events
 */
export class EventCoordinator {
	constructor(connection, rooms, sync) {
		this.connection = connection;
		this.rooms = rooms;
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
		// Update state via event instead of direct call
		dispatchEvent('network:connecting');

		// Call connection service
		const peers = this.connection.getDefaultPeers();
		this.connection.updatePeers(peers);
	}

	handleDisconnect() {
		// Call connection service first
		this.connection.disconnect();

		// Then update state via event instead of direct call
		dispatchEvent('network:manuallyDisconnected');
	}

	handleTestConnection() {
		this.connection.testConnection();
	}

	// ===== AUTH EVENTS =====
	handleCreateIdentity(alias) {
		this.connection.createIdentity(alias);
	}

	handleLogin(credentials) {
		this.connection.login(credentials.alias, credentials.password);
	}

	handleLogout() {
		this.connection.logout();
	}

	handleUserAuthenticated(alias) {
		// Update state via event instead of direct call
		dispatchEvent('auth:authenticated', { alias });
	}

	handleUserLoggedOut() {
		// Update state via event instead of direct call
		dispatchEvent('auth:anonymous');
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
			// Update state via event instead of direct call
			dispatchEvent('network:connected', { connected, total });

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
		// Update state via event instead of direct call
		dispatchEvent('auth:authenticated', { alias });
	}
}
