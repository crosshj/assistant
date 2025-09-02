import { Header } from './Header.js';

export class HeaderController {
	constructor() {
		// Create Header component with controller reference
		this.ui = new Header({ controller: this });

		this.setupEventListeners();

		// Initialize UI with initial values
		this.initializeUI();
	}

	setConnection(connection) {
		this.connection = connection;
	}

	setupEventListeners() {
		// Listen for auth events directly from Connection service
		document.addEventListener('auth:authenticated', (event) => {
			this.handleAuthAuthenticated(event.detail);
		});

		document.addEventListener('auth:anonymous', () => {
			this.handleAuthAnonymous();
		});

		// Listen for network events from EventCoordinator
		document.addEventListener('network:connecting', () => {
			this.handleNetworkConnecting();
		});

		document.addEventListener('network:connected', (event) => {
			this.handleNetworkConnected(event.detail);
		});

		document.addEventListener('network:manuallyDisconnected', () => {
			this.handleNetworkManuallyDisconnected();
		});

		// Listen for room lifecycle events directly from RoomManager
		document.addEventListener('room:joined', (event) => {
			this.handleRoomJoined(event.detail);
		});

		document.addEventListener('room:left', (event) => {
			this.handleRoomLeft(event.detail);
		});

		// Listen for connection status changes directly from connection service
		if (this.connection && this.connection.on) {
			this.connection.on('connectionStatusChanged', (data) => {
				this.handleConnectionStatusChanged(data);
			});
		}
	}

	// ===== CONNECTION EVENTS =====

	handleConnect() {
		// Immediately show connecting state in UI - be optimistic!
		this.updateConnectionStatus('connecting');

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

	// ===== NETWORK EVENTS =====

	handleNetworkConnecting() {
		this.updateConnectionStatus('connecting');
	}

	handleNetworkConnected(event) {
		const { connected, total } = event;
		this.updateConnectionStatus('connected', { connected, total });
	}

	handleNetworkManuallyDisconnected() {
		this.updateConnectionStatus('disconnected');
	}

	// ===== AUTH EVENTS =====

	handleAuthAuthenticated(event) {
		const { alias } = event;
		this.updateAuthStatus({ status: 'authenticated', alias });
	}

	handleAuthAnonymous() {
		this.updateAuthStatus({ status: 'anonymous', alias: 'anon' });
	}

	// ===== ROOM EVENTS =====

	handleRoomJoined(event) {
		const { room } = event;
		// Update room status to joined
		this.updateRoomStatus('joined', { name: room, status: 'joined' });
	}

	handleRoomLeft(event) {
		// Update room status to not joined
		this.updateRoomStatus('not_joined', {
			name: null,
			status: 'not_joined',
		});
	}

	// ===== STATE MANAGEMENT =====
	// All state management now handled by direct service event listeners above

	handleConnectionStatusChanged(data) {
		// Handle connection status changes directly from connection service
		const status = data.status || 'connected';
		const connected = data.connected || 0;
		const total = data.total || 0;

		// Update connection status directly from service
		this.updateConnectionStatus(status, { connected, total });
	}

	// ===== DELEGATION METHODS - CONTROLLER SHOULD NOT MANIPULATE UI DIRECTLY =====

	updateConnectionStatus(status, networkState = null) {
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

	initializeUI() {
		// Set initial peer values via component method
		if (this.connection && this.connection.getDefaultPeers) {
			const defaultPeers = this.connection.getDefaultPeers().join(',');
			this.ui.setInitialPeers(defaultPeers);
		}

		// Initial state will be set by service events as they fire
	}

	setInitialValues() {
		// Deprecated - use initializeUI() instead
		this.initializeUI();
	}
}
