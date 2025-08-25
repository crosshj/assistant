import { GunDBWrapper } from '../lib/gunWrapper.js';

/**
 * Event Coordinator
 * Listens to UI events and coordinates between services and StateManager
 */
export class EventCoordinator {
	constructor(connection, auth, rooms, stateManager, sync, room) {
		this.connection = connection;
		this.auth = auth;
		this.rooms = rooms;
		this.stateManager = stateManager;
		this.sync = sync;
		this.gunWrapper = new GunDBWrapper(connection);
		this.room = room;

		// Listen to UI events from Header
		this.setupUIEventListeners();
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
		document.addEventListener('ui:joinRoom', (e) =>
			this.handleJoinRoom(e.detail)
		);
		document.addEventListener('ui:autoJoinRoom', (e) =>
			this.handleAutoJoinRoom(e)
		);
		document.addEventListener('ui:leaveRoom', () => this.handleLeaveRoom());
		document.addEventListener('ui:createIdentity', (e) =>
			this.handleCreateIdentity(e.detail)
		);
		document.addEventListener('ui:login', (e) =>
			this.handleLogin(e.detail)
		);

		// Listen for graph events
		document.addEventListener('graph:requestProps', (e) => {
			this.handleRequestProps(e.detail);
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

	// ===== ROOM EVENTS =====

	handleJoinRoom(roomName) {
		// Update state to joining
		this.stateManager.setRoomJoining(roomName);

		// Call room service
		const result = this.rooms.joinRoom(roomName, this.connection);

		if (result) {
			// Room joined successfully - state will be updated by room service
		} else {
			// Room join failed - revert state
			this.stateManager.setRoomLeft();
		}
	}

	handleAutoJoinRoom(event) {
		const roomName = event?.detail;
		if (roomName) {
			this.handleJoinRoom(roomName);
		}
	}

	handleLeaveRoom() {
		// Call room service first
		this.rooms.leaveRoom();

		// Note: Graph clearing is now handled automatically by the visualization component
		// when it detects room state changes via the stateChanged event

		// Then update state
		this.stateManager.setRoomLeft();
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
		// Handle case where room service passes room name as status when joining
		if (status === roomName && roomName) {
			// Update state - let the Room component handle UI changes
			this.stateManager.setRoomJoined(roomName);

			// Update URL hash to reflect current room
			this.updateRoomHash(roomName);

			// Fire event for Room component to listen to
			document.dispatchEvent(
				new CustomEvent('room:joined', {
					detail: { room: roomName },
				})
			);

			// Start data sync immediately
			if (this.rooms.isInRoom() && this.sync) {
				this.sync.subscribeToRoom();
			}
		} else if (status && status.includes('🏠') && roomName) {
			// Update state - let the Room component handle UI changes
			this.stateManager.setRoomJoined(roomName);

			// Update URL hash to reflect current room
			this.updateRoomHash(roomName);

			// Fire event for Room component to listen to
			document.dispatchEvent(
				new CustomEvent('room:joined', {
					detail: { room: roomName },
				})
			);

			// Start data sync immediately
			if (this.rooms.isInRoom() && this.sync) {
				this.sync.subscribeToRoom();
			}
		} else if (status === 'not joined') {
			// Update state - let the Room component handle UI changes
			this.stateManager.setRoomLeft();

			// Clear room from URL hash
			this.updateRoomHash(null);

			// Fire event for Room component to listen to
			document.dispatchEvent(new CustomEvent('room:left'));
		}
	}

	// Update URL hash to reflect current room
	updateRoomHash(roomName) {
		if (roomName) {
			// Set hash to just the room name
			window.location.hash = `#${roomName}`;
		} else {
			// Clear hash when leaving room
			window.location.hash = '';
		}
	}

	onUserAuthenticated(alias) {
		this.stateManager.setAuthAuthenticated(alias);
	}

	// ===== GRAPH EVENTS =====

	async handleRequestProps(detail) {
		const { elementId, elementType, room } = detail;
		if (!elementId || !room || !elementType) {
			return;
		}

		// Set a flag to prevent graph updates during props loading
		if (this.sync) {
			this.sync.setPropsLoadingFlag(true);
		}

		try {
			let props;
			try {
				if (elementType === 'node') {
					props = await this.gunWrapper.getNodeProps(room, elementId);

					// Also get full node data to see metadata and check for version references
					await this.gunWrapper.getNodeFullData(room, elementId);
				} else if (elementType === 'edge') {
					props = await this.gunWrapper.getEdgeProps(room, elementId);
				} else {
					throw new Error(`Unknown element type: ${elementType}`);
				}
			} catch (error) {
				// Try fallback method if primary method fails
				// Try fallback method if primary method fails
				if (elementType === 'node') {
					props = await this.gunWrapper.getPropsFallback(
						room,
						elementId,
						true
					);
				} else if (elementType === 'edge') {
					props = await this.gunWrapper.getPropsFallback(
						room,
						elementId,
						false
					);
				}
			}

			// Emit the props loaded event
			document.dispatchEvent(
				new CustomEvent('graph:propsLoaded', {
					detail: {
						elementId,
						elementType,
						props,
						room,
					},
				})
			);
		} catch (error) {
			// Emit empty props on error
			document.dispatchEvent(
				new CustomEvent('graph:propsLoaded', {
					detail: {
						elementId,
						elementType,
						props: {},
						room,
					},
				})
			);
		} finally {
			// Clear the props loading flag
			if (this.sync) {
				this.sync.setPropsLoadingFlag(false);
			}
		}
	}
}
