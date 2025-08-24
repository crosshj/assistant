import { GunDBWrapper } from './gunWrapper.js';

/**
 * Event Coordinator
 * Listens to UI events and coordinates between services and StateManager
 */
export class EventCoordinator {
	constructor(connection, auth, rooms, stateManager, sync, roomList) {
		this.connection = connection;
		this.auth = auth;
		this.rooms = rooms;
		this.stateManager = stateManager;
		this.sync = sync;
		this.gunWrapper = new GunDBWrapper(connection);
		this.roomList = roomList;

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
		window.addEventListener('graph:requestProps', (e) => {
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
		if (this.rooms.joinRoom(roomName, this.connection)) {
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

		// If we're connected but not in a room, show room selection mode
		// But only if we're not already in room selection mode to prevent loops
		// AND only if there's no hash tag in the URL (which would indicate auto-join)
		if (connected && this.rooms && !this.rooms.isInRoom()) {
			// Check if there's a hash tag that would indicate auto-join
			if (this.shouldShowRoomSelector()) {
				// Check if we're already in room selection mode to prevent unnecessary switches
				const mainGrid = document.getElementById('mainGrid');
				if (
					mainGrid &&
					!mainGrid.classList.contains('room-selection-mode')
				) {
					this.showRoomSelectionLayout();
				}
			} else {
				// Auto-join the room specified in the hash
				this.handleAutoJoinFromHash();
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
		if (status && status.includes('📊') && roomName) {
			// Check if we're already in room mode to prevent unnecessary switches
			const mainGrid = document.getElementById('mainGrid');
			if (mainGrid && !mainGrid.classList.contains('room-mode')) {
				this.stateManager.setRoomJoined(roomName);

				// Update URL hash to reflect current room
				this.updateRoomHash(roomName);

				// Hide room list when room is joined
				if (this.roomList) {
					this.roomList.hide();
				}

				// Switch to in-room layout mode
				this.showInRoomLayout();

				// Start data sync immediately instead
				if (this.rooms.isInRoom() && this.sync) {
					this.sync.subscribeToRoom();
				}
			}
		} else if (status === 'not joined') {
			// Check if we're already in room selection mode to prevent unnecessary switches
			const mainGrid = document.getElementById('mainGrid');
			if (
				mainGrid &&
				!mainGrid.classList.contains('room-selection-mode')
			) {
				this.stateManager.setRoomLeft();

				// Clear room from URL hash
				this.updateRoomHash(null);

				// Switch to room selection layout mode
				this.showRoomSelectionLayout();

				// Show room list when no room is joined
				if (this.roomList) {
					this.roomList.show();
				}
			}
		}
	}

	// Switch to in-room layout (narrow left edit, wide middle graph, narrow right activity)
	showInRoomLayout() {
		// Call the main app's layout method if available
		if (
			window.gunApp &&
			typeof window.gunApp.showInRoomMode === 'function'
		) {
			window.gunApp.showInRoomMode();
		} else {
			// Fallback: manually show/hide panels
			const editPanel = document.getElementById('editPanel');
			const graphPanel = document.getElementById('graphPanel');
			const roomList = document.getElementById('roomList');
			const mainGrid = document.getElementById('mainGrid');

			if (mainGrid) {
				mainGrid.classList.remove('room-selection-mode');
				mainGrid.classList.add('room-mode');
			}
			if (roomList) roomList.style.display = 'none';
			if (editPanel) editPanel.style.display = 'block';
			if (graphPanel) graphPanel.style.display = 'block';
		}
	}

	// Switch to room selection layout (wide left room selection, narrow right activity)
	showRoomSelectionLayout() {
		// Call the main app's layout method if available
		if (
			window.gunApp &&
			typeof window.gunApp.showRoomSelectionMode === 'function'
		) {
			window.gunApp.showRoomSelectionMode();
		} else {
			// Fallback: manually show/hide panels
			const editPanel = document.getElementById('editPanel');
			const graphPanel = document.getElementById('graphPanel');
			const roomList = document.getElementById('roomList');
			const mainGrid = document.getElementById('mainGrid');

			if (mainGrid) {
				mainGrid.classList.remove('room-mode');
				mainGrid.classList.add('room-selection-mode');
			}
			if (roomList) roomList.style.display = 'block';
			if (editPanel) editPanel.style.display = 'none';
			if (graphPanel) graphPanel.style.display = 'none';
		}
	}

	// Show the edit and graph panels
	showEditAndGraphPanels() {
		// This method is now replaced by showInRoomLayout()
		this.showInRoomLayout();
	}

	// Hide the edit and graph panels
	hideEditAndGraphPanels() {
		// This method is now replaced by showRoomSelectionLayout()
		this.showRoomSelectionLayout();
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
			console.log(
				'❌ EventCoordinator: Missing required data for props request:',
				detail
			);
			return;
		}

		console.log(
			'🔍 EventCoordinator: Starting props request for:',
			elementType,
			elementId,
			'in room:',
			room
		);

		// Set a flag to prevent graph updates during props loading
		if (this.sync) {
			this.sync.setPropsLoadingFlag(true);
		}

		try {
			let props;
			try {
				if (elementType === 'node') {
					console.log('🔍 EventCoordinator: Fetching node props...');
					props = await this.gunWrapper.getNodeProps(room, elementId);

					// Also get full node data to see metadata and check for version references
					console.log(
						'🔍 EventCoordinator: Getting full node data for metadata analysis...'
					);
					await this.gunWrapper.getNodeFullData(room, elementId);
				} else if (elementType === 'edge') {
					console.log('🔍 EventCoordinator: Fetching edge props...');
					props = await this.gunWrapper.getEdgeProps(room, elementId);
				} else {
					throw new Error(`Unknown element type: ${elementType}`);
				}
			} catch (error) {
				console.log(
					'⚠️ EventCoordinator: Primary props fetch failed, trying fallback:',
					error.message
				);
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

			console.log(
				'🔍 EventCoordinator: Props fetched successfully:',
				props
			);

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
			console.log(
				'❌ EventCoordinator: All props fetch methods failed:',
				error.message
			);
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
