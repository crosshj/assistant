import { log } from '../utils/utils.js';

/**
 * Centralized State Manager
 * Single source of truth for all application state
 */
export class StateManager {
	constructor(sidebar = null) {
		this.state = {
			// Network state
			network: {
				status: 'connecting', // 'disconnected', 'connecting', 'partial', 'connected'
				connected: 0,
				total: 0,
				isManuallyDisconnected: false,
			},

			// Room state
			room: {
				status: 'not_joined', // 'not_joined', 'joining', 'joined'
				name: null,
				canJoin: false,
			},

			// Authentication state
			auth: {
				status: 'anonymous', // 'anonymous', 'logging_in', 'authenticated'
				alias: 'anon',
			},
		};

		this.listeners = new Map();
		this._connectionStartTime = Date.now(); // Track when we started connecting
		this._maxConnectionTime = 10000; // 10 seconds max connection time
		this.sidebar = sidebar; // Reference to sidebar for activity logging
		this._timeoutInterval = null; // Track the timeout interval
		this._userManuallyLeftRoom = false; // Track if user manually left vs. page refresh

		// Start periodic connection timeout check
		this._startConnectionTimeoutCheck();
	}

	// Event system
	on(event, callback) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event).push(callback);
	}

	emit(event, data) {
		const listeners = this.listeners.get(event);
		if (listeners) {
			listeners.forEach((callback) => callback(data));
		}
	}

	// Get current state (immutable copy)
	getState() {
		return JSON.parse(JSON.stringify(this.state));
	}

	// ===== NETWORK STATE MANAGEMENT =====

	setNetworkConnecting() {
		this.state.network.status = 'connecting';
		this.state.network.isManuallyDisconnected = false;
		this._connectionStartTime = Date.now(); // Reset connection timer
		this._updateRoomCanJoin();
		this._emitStateChange();

		// Restart the connection timeout check
		this._startConnectionTimeoutCheck();

		const message = '🔄 Network: Connecting...';
		log(message);
		// Don't log connection messages to activity feed - too noisy
		// if (this.sidebar) this.sidebar.info(message);
	}

	setNetworkConnected(connected, total) {
		const wasDisconnected = this.state.network.status === 'disconnected';
		const wasConnecting = this.state.network.status === 'connecting';

		this.state.network.connected = connected;
		this.state.network.total = total;

		if (connected === 0) {
			// If we were connecting and still have no connections, keep connecting
			// Let the interval-based timeout handle giving up
			if (wasConnecting) {
				this.state.network.status = 'connecting';
			} else {
				this.state.network.status = 'disconnected';
			}
		} else if (connected < total) {
			this.state.network.status = 'partial';
			// Reset connection timer since we have some connections
			this._connectionStartTime = Date.now();
		} else {
			this.state.network.status = 'connected';
			// Reset connection timer since we have full connection
			this._connectionStartTime = Date.now();
		}

		this._updateRoomCanJoin();
		this._emitStateChange();

		// Log significant changes - only log when actually transitioning between states
		if (wasDisconnected && connected > 0) {
			const message = `✅ Network: Connected to ${connected}/${total} peers`;
			log(message);
			// Don't log connection messages to activity feed - too noisy
			// if (this.sidebar) this.sidebar.success(message);
		} else if (wasConnecting && connected > 0) {
			// Log when we first get connections after being in connecting state
			const message = `🔌 Network: First connections established: ${connected}/${total} peers`;
			log(message);
			// Don't log connection messages to activity feed - too noisy
			// if (this.sidebar) this.sidebar.success(message);
		} else if (wasConnecting && connected === total) {
			// Log when we achieve full connection from connecting state
			const message = `🎯 Network: Full connection achieved: ${connected}/${total} peers`;
			log(message);
			// Don't log connection messages to activity feed - too noisy
			// if (this.sidebar) this.sidebar.success(message);
		}
		// Removed duplicate disconnection logging - timeout now handles this directly
	}

	setNetworkManuallyDisconnected() {
		this.state.network.status = 'disconnected';
		this.state.network.connected = 0;
		this.state.network.isManuallyDisconnected = true;
		this._connectionStartTime = Date.now(); // Reset connection timer
		this._updateRoomCanJoin();
		this._emitStateChange();

		// Stop the connection timeout check since we're manually disconnected
		this._stopConnectionTimeoutCheck();

		const message = '✅ Network: Manually disconnected';
		log(message);
		// Don't log connection messages to activity feed - too noisy
		// if (this.sidebar) this.sidebar.success(message);
	}

	// ===== ROOM STATE MANAGEMENT =====

	setRoomJoining(roomName) {
		this.state.room.status = 'joining';
		this.state.room.name = roomName;
		this._autoJoinTriggered = false; // Reset flag when starting to join
		this._emitStateChange();
		log(`🔄 Room: Joining ${roomName}...`);
	}

	setRoomJoined(roomName) {
		this.state.room.status = 'joined';
		this.state.room.name = roomName;
		// Reset manual leave flag when user joins a room (allows auto-join on future refreshes)
		this._userManuallyLeftRoom = false;
		log('🔍 DEBUG: User joined room - auto-join re-enabled');
		this._emitStateChange();
		log(`✅ Room: Joined ${roomName}`);
	}

	setRoomLeft() {
		this.state.room.status = 'not_joined';
		this.state.room.name = null;
		// Mark that user manually left the room (prevents auto-join)
		this._userManuallyLeftRoom = true;
		log('🔍 DEBUG: User manually left room - auto-join disabled');
		this._emitStateChange();
		log('✅ Room: Left room');
	}

	// ===== AUTHENTICATION STATE MANAGEMENT =====

	setAuthLoggingIn(alias) {
		this.state.auth.status = 'logging_in';
		this.state.auth.alias = alias;
		this._emitStateChange();
		log(`🔄 Auth: Logging in as ${alias}...`);
	}

	setAuthAuthenticated(alias) {
		this.state.auth.status = 'authenticated';
		this.state.auth.alias = alias;
		this._emitStateChange();
		log(`✅ Auth: Authenticated as ${alias}`);
	}

	setAuthAnonymous() {
		this.state.auth.status = 'anonymous';
		this.state.auth.alias = 'anon';
		this._emitStateChange();
	}

	// ===== INTERNAL HELPERS =====

	_updateRoomCanJoin() {
		// Room can be joined if network is connected (even partially) and not manually disconnected
		this.state.room.canJoin =
			(this.state.network.status === 'connected' ||
				this.state.network.status === 'partial') &&
			!this.state.network.isManuallyDisconnected;
	}

	_shouldGiveUpConnecting() {
		// Give up connecting if we've been trying for too long
		const timeElapsed = Date.now() - this._connectionStartTime;
		if (timeElapsed > this._maxConnectionTime) {
			// Don't log here - the interval timeout will handle the logging
			return true;
		}
		return false;
	}

	_startConnectionTimeoutCheck() {
		// Clear any existing interval first
		if (this._timeoutInterval) {
			clearInterval(this._timeoutInterval);
		}

		// Check every second if we should give up connecting
		this._timeoutInterval = setInterval(() => {
			if (
				this.state.network.status === 'connecting' &&
				this.state.network.connected === 0
			) {
				const timeElapsed = Date.now() - this._connectionStartTime;
				// Don't log timeout check messages - too noisy
				// log(
				// 	`⏱️ Connection timeout check: ${timeElapsed}ms elapsed, max: ${this._maxConnectionTime}ms`
				// );

				if (this._shouldGiveUpConnecting()) {
					const timeoutMessage =
						'⏰ Network: Connection timeout - forcing transition to disconnected state';
					log(timeoutMessage);

					// Don't log timeout messages to activity feed - too noisy
					// if (this.sidebar) {
					// 	this.sidebar.warning(timeoutMessage);
					// }

					// Directly update state to avoid triggering setNetworkConnected logic
					this.state.network.status = 'disconnected';
					this.state.network.connected = 0;
					this._updateRoomCanJoin();
					this._emitStateChange();

					// Clear the interval after timeout - no need to keep checking
					this._stopConnectionTimeoutCheck();
				}
			}
		}, 1000); // Check every second
	}

	_stopConnectionTimeoutCheck() {
		if (this._timeoutInterval) {
			clearInterval(this._timeoutInterval);
			this._timeoutInterval = null;
		}
	}

	_emitStateChange() {
		this.emit('stateChanged', this.getState());

		// Auto-join room when network becomes available (but not when connecting)
		// Only trigger if we haven't already started joining and user didn't manually leave
		if (
			this.state.room.canJoin &&
			this.state.room.status === 'not_joined' &&
			this.state.network.status !== 'connecting' &&
			!this._userManuallyLeftRoom // Don't auto-join if user manually left
		) {
			log('🔍 DEBUG: Auto-join logic triggered!');
			log('🔍 DEBUG: canJoin:', this.state.room.canJoin);
			log('🔍 DEBUG: room status:', this.state.room.status);
			log('🔍 DEBUG: network status:', this.state.network.status);
			log('🔍 DEBUG: userManuallyLeftRoom:', this._userManuallyLeftRoom);

			// Add small delay to ensure state is fully stable before room joining
			setTimeout(() => {
				// Get the room name from the input field, default to 'public'
				const roomInput = document.getElementById('room');
				const roomName = roomInput
					? roomInput.value.trim() || 'public'
					: 'public';

				log(
					'🔍 DEBUG: Dispatching auto-join event for room:',
					roomName
				);
				document.dispatchEvent(
					new CustomEvent('ui:autoJoinRoom', {
						detail: roomName,
					})
				);
			}, 50); // 50ms delay to ensure state propagation
		}
	}

	// ===== PUBLIC STATE QUERIES =====

	canJoinRoom() {
		return (
			this.state.room.canJoin && this.state.room.status === 'not_joined'
		);
	}

	canLeaveRoom() {
		return this.state.room.status === 'joined';
	}

	isConnected() {
		return this.state.network.connected > 0;
	}

	isInRoom() {
		return this.state.room.status === 'joined';
	}
}
