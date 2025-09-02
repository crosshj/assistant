import { Header } from './Header.js';
import { dispatchEvent } from '../lib/utils.js';

export class HeaderController {
	constructor() {
		// Create Header component with controller reference
		this.ui = new Header({ controller: this });

		this.setupEventListeners();

		// Initialize UI with initial values
		this.initializeUI();
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

		document.addEventListener('network:disconnected', () => {
			this.handleNetworkDisconnected();
		});

		// Listen for room lifecycle events directly from RoomManager
		document.addEventListener('room:joined', (event) => {
			this.handleRoomJoined(event.detail);
		});

		document.addEventListener('room:left', (event) => {
			this.handleRoomLeft(event.detail);
		});

		// No direct service listeners; rely on DOM events only
	}

	// ===== CONNECTION EVENTS =====

	handleConnect() {
		// Immediately show connecting state in UI - be optimistic!
		this.updateConnectionStatus('connecting');

		// Dispatch UI event for connection service to handle
		dispatchEvent('ui:connect');
	}

	handleDisconnect() {
		// Dispatch UI event for connection service to handle
		dispatchEvent('ui:disconnect');
	}

	handleTestConnection() {
		// Dispatch UI event for connection service to handle
		dispatchEvent('ui:testConnection');
	}

	// ===== ROOM EVENTS =====

	handleJoinRoom(roomName) {
		if (roomName) {
			// Dispatch the same global event for other components to listen to
			dispatchEvent('ui:joinRoom', roomName);
		}
	}

	handleLeaveRoom() {
		// Dispatch the same global event for other components to listen to
		dispatchEvent('ui:leaveRoom');
	}

	// ===== AUTH EVENTS =====

	handleCreateUser(alias) {
		if (alias) {
			// Dispatch UI event for connection service to handle
			dispatchEvent('ui:createIdentity', alias);
		}
	}

	handleLogin(alias) {
		if (alias) {
			// Dispatch the same global event for other components to listen to
			dispatchEvent('ui:login', alias);
		}
	}

	// ===== UI EVENTS =====

	handleShowConnectionDetails() {
		// Dispatch the same global event for other components to listen to
		dispatchEvent('ui:showConnectionDetails');
	}

	// ===== NETWORK EVENTS =====

	handleNetworkConnecting() {
		this.updateConnectionStatus('connecting');
	}

	handleNetworkConnected(event) {
		const { connected, total } = event;
		this.updateConnectionStatus('connected', { connected, total });
	}

	handleNetworkDisconnected() {
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
		// Provide a safe default for peers (no connection dependency)
		this.ui.setInitialPeers('');

		// Initial state will be set by service events as they fire
	}

	setInitialValues() {
		// Deprecated - use initializeUI() instead
		this.initializeUI();
	}
}
