import { Header } from './Header.js';

export class HeaderController {
	constructor(connection, auth, stateManager) {
		this.connection = connection;
		this.auth = auth;
		this.stateManager = stateManager;
		this.currentConnectionStatus = 'disconnected'; // Track current state

		// Create Header component with controller reference
		this.ui = new Header({ controller: this });

		this.setupEventListeners();
	}

	setupEventListeners() {
		// Listen for state changes from services
		document.addEventListener('stateChanged', (event) => {
			this.handleStateChange(event.detail);
		});

		// Listen for connection status changes directly from connection service
		if (this.connection && this.connection.on) {
			this.connection.on('connectionStatusChanged', (data) => {
				this.handleConnectionStatusChanged(data);
			});
		}

		// Note: HeaderController does NOT listen to events it dispatches
		// This prevents circular event loops
		// Other components (RoomController, EventCoordinator) listen to these events
	}

	// ===== CONNECTION EVENTS =====

	handleConnect() {
		// Immediately show connecting state in UI - be optimistic!
		this.updateConnectionStatus('connecting');

		// Tell StateManager we're starting a connection attempt
		if (this.stateManager && this.stateManager.setNetworkConnecting) {
			this.stateManager.setNetworkConnecting();
		}

		// Show connecting spinner in room pane when actively connecting
		document.dispatchEvent(new CustomEvent('ui:showConnectingSpinner'));

		// Add a longer delay to make "Connecting..." state clearly visible
		// This prevents the connection service from immediately overriding it
		setTimeout(() => {
			// Use default peers since we're hiding the peer input field
			this.connection.updatePeers(this.connection.getDefaultPeers());

			// Restart connection monitoring after reconnecting
			if (this.connection.startMonitoring) {
				this.connection.startMonitoring();
			}
		}, 2000); // 2000ms delay to show "Connecting..." state
	}

	handleDisconnect() {
		this.connection.disconnect();
	}

	handleTestConnection() {
		// Test the connection
		this.connection.testConnection();
	}

	// ===== ROOM EVENTS =====

	handleJoinRoom(roomName) {
		if (roomName) {
			// Dispatch the same global event for other components to listen to
			document.dispatchEvent(
				new CustomEvent('ui:joinRoom', { detail: roomName })
			);
		}
	}

	handleLeaveRoom() {
		// Dispatch the same global event for other components to listen to
		document.dispatchEvent(new CustomEvent('ui:leaveRoom'));
	}

	// ===== AUTH EVENTS =====

	handleCreateUser(alias) {
		if (alias) {
			// Dispatch the same global event for other components to listen to
			document.dispatchEvent(
				new CustomEvent('ui:createUser', { detail: alias })
			);
		}
	}

	handleLogin(alias) {
		if (alias) {
			// Dispatch the same global event for other components to listen to
			document.dispatchEvent(
				new CustomEvent('ui:login', { detail: alias })
			);
		}
	}

	// ===== UI EVENTS =====

	handleShowConnectionDetails() {
		// Dispatch the same global event for other components to listen to
		document.dispatchEvent(new CustomEvent('ui:showConnectionDetails'));
	}

	// ===== STATE MANAGEMENT =====

	handleStateChange(state) {
		// Update connection status with full network state
		if (state.network && state.network.status) {
			this.updateConnectionStatus(state.network.status, state.network);
		}

		// Update room status with full room state
		if (state.room && state.room.status) {
			this.updateRoomStatus(state.room.status, state.room);
		}

		// Update auth status
		if (state.auth && state.auth.status) {
			this.updateAuthStatus(state.auth);
		}
	}

	handleConnectionStatusChanged(data) {
		// Handle connection status changes directly from connection service
		const status = data.status || 'connected';
		const connected = data.connected || 0;
		const total = data.total || 0;

		// BE MORE AGGRESSIVE: Don't let connection service override our optimistic state
		// If we're showing "Connecting..." and the service says "connecting", keep our state
		if (
			status === 'connecting' &&
			this.currentConnectionStatus === 'connecting'
		) {
			return; // Don't update at all
		}

		// Also prevent immediate transition from "Connecting..." to "Connected"
		// Give our optimistic state time to be visible
		if (
			status === 'connected' &&
			this.currentConnectionStatus === 'connecting'
		) {
			// Add a longer delay to maintain "Connecting..." state
			setTimeout(() => {
				this.updateConnectionStatus(status, { connected, total });
			}, 500); // 500ms delay to maintain connecting state
			return;
		}

		// Only update for other meaningful state changes
		if (status !== 'connecting') {
			this.updateConnectionStatus(status, { connected, total });
		}
	}

	// ===== DELEGATION METHODS - CONTROLLER SHOULD NOT MANIPULATE UI DIRECTLY =====

	updateConnectionStatus(status, networkState = null) {
		// Track state changes for logging
		if (this.currentConnectionStatus !== status) {
			const timestamp = new Date().toISOString().split('T')[1]; // HH:MM:SS.mmm format
			console.log(
				`Header [${timestamp}]: ${this.currentConnectionStatus} → ${status}`
			);
			this.currentConnectionStatus = status;
		}

		// Delegate to Header component - controller should not manipulate UI directly
		this.ui.updateConnectionStatus(status, networkState);
	}

	updateRoomStatus(status, roomState = null) {
		// Delegate to Header component - controller should not manipulate UI directly
		this.ui.updateRoomStatus(status, roomState);
	}

	updateAuthStatus(status) {
		// Delegate to Header component - controller should not manipulate UI directly
		this.ui.updateAuthStatus(status);
	}

	// ===== PUBLIC METHODS FOR EXTERNAL UPDATES =====

	setConnectionStatus(status) {
		this.updateConnectionStatus(status);
	}

	setRoomStatus(status) {
		this.updateRoomStatus(status);
	}

	setAuthStatus(status) {
		this.updateAuthStatus(status);
	}

	// ===== INITIALIZATION =====

	setInitialValues() {
		// Set initial peer values via component method
		if (this.connection.getDefaultPeers) {
			const defaultPeers = this.connection.getDefaultPeers().join(',');
			this.ui.setInitialPeers(defaultPeers);
		}

		// Render initial state if stateManager is available
		if (this.stateManager) {
			const state = this.stateManager.getState();
			this.renderInitialState(state);
		}
	}

	renderInitialState(state) {
		// Update connection status
		if (state.network) {
			this.updateConnectionStatus(state.network.status);
		}

		// Update room status
		if (state.room) {
			this.updateRoomStatus(state.room.status);
		}

		// Update auth status
		if (state.auth) {
			this.updateAuthStatus(state.auth);
		}
	}
}
