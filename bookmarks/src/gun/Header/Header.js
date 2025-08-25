import { html } from '../lib/utils.js';
import './Header.css';

export class Header {
	constructor(connection, auth, stateManager) {
		this.connection = connection;
		this.auth = auth;
		this.stateManager = stateManager;
		this.container = null;
		this.elements = {};

		this.render();
		this.bindEvents();
	}

	render() {
		// Find the header container
		this.container = document.getElementById('header-container');
		if (!this.container) {
			console.error('Header container not found');
			return;
		}

		// Create the header DOM structure
		this.container.innerHTML = html`
			<div class="row">
				<!-- Network/Connection Section (FIRST position - always visible) -->
				<div
					class="row-item"
					id="networkSection"
					style="display: flex; gap: 0.5rem; align-items: center"
				>
					<strong>Network</strong>

					<!-- Connection Status (always visible) -->
					<span
						class="pill mono"
						id="connectionStatus"
						title="Connection status"
					>
						Connecting...
					</span>

					<!-- Connection Controls (shown conditionally) -->
					<div
						id="connectionControls"
						style="display: none"
					>
						<input
							id="peers"
							size="40"
							placeholder="Peer URLs"
						/>
					</div>

					<!-- Connect Button (shown when disconnected or partial) -->
					<button
						id="connectBtn"
						class="primary"
						style="display: none"
					>
						Connect
					</button>

					<!-- Disconnect Button (shown when connected) -->
					<button
						id="disconnectBtn"
						class="secondary"
						style="display: none"
					>
						Disconnect
					</button>

					<!-- Test Button (shown when needed) -->
					<button
						id="testConnection"
						class="secondary"
						style="display: none"
					>
						Test
					</button>
				</div>

				<div class="header-divider"></div>

				<!-- Room Management Section (SECOND position, hidden when not connected) -->
				<div
					class="row-item"
					id="roomSection"
					style="
						display: flex;
						visibility: hidden;
						gap: 0.5rem;
						align-items: center;
						justify-content: center;
					"
				>
					<strong>Room</strong>
					<!-- Loading state (shown initially) -->
					<div
						id="roomLoading"
						style="display: flex; gap: 0.5rem; align-items: center;"
					>
						<span class="loading-text">Loading...</span>
					</div>
					<!-- Room input and join button (shown when not in a room) -->
					<div
						id="roomInputs"
						style="display: none; gap: 0.5rem; align-items: center;"
					>
						<input
							id="room"
							size="14"
							placeholder="graph-room"
						/>
						<button
							id="join"
							class="primary"
						>
							Join
						</button>
					</div>
					<!-- Room status pill and leave button (shown when in a room) -->
					<div
						id="roomStatus"
						style="display: none; gap: 0.5rem; align-items: center;"
					>
						<span
							class="pill mono room-pill"
							id="roomPill"
							title="Current room"
						>
							<span class="room-icon">🏠</span>
							<span class="room-name">not joined</span>
						</span>
						<button
							id="leave"
							class="secondary"
						>
							Leave
						</button>
					</div>
				</div>
				<div
					class="header-divider"
					id="roomDivider"
					style="visibility: hidden"
				></div>

				<!-- Authentication Section (visibility controlled by auth status) -->
				<div
					class="row-item"
					id="authSection"
					style="
						display: flex;
						visibility: visible;
						align-items: center;
						gap: 0.5rem;
						justify-content: flex-end;
					"
				>
					<strong>Identity</strong>
					<!-- Identity inputs and buttons (shown when not authenticated) -->
					<div
						id="identityInputs"
						style="display: flex; gap: 0.5rem; align-items: center;"
					>
						<input
							id="alias"
							size="10"
							placeholder="alias"
						/>
						<button id="createPair">New ID</button>
						<button id="login">Login</button>
					</div>
					<!-- Identity status pill (shown when authenticated) -->
					<div
						id="identityStatus"
						style="display: none;"
					>
						<span
							class="pill mono identity-pill"
							id="identityPill"
							title="Current user"
						>
							<span class="identity-icon">👤</span>
							<span class="identity-name">anon</span>
						</span>
					</div>
				</div>
			</div>
		`;

		// Store references to important elements
		this.elements = {
			connectionStatus: this.container.querySelector('#connectionStatus'),
			connectionControls: this.container.querySelector(
				'#connectionControls'
			),
			peers: this.container.querySelector('#peers'),
			connectBtn: this.container.querySelector('#connectBtn'),
			disconnectBtn: this.container.querySelector('#disconnectBtn'),
			testConnection: this.container.querySelector('#testConnection'),
			roomSection: this.container.querySelector('#roomSection'),
			room: this.container.querySelector('#room'),
			roomLoading: this.container.querySelector('#roomLoading'),
			roomInputs: this.container.querySelector('#roomInputs'),
			roomStatus: this.container.querySelector('#roomStatus'),
			roomPill: this.container.querySelector('#roomPill'),
			roomName: this.container.querySelector('.room-name'),
			join: this.container.querySelector('#join'),
			leave: this.container.querySelector('#leave'),
			roomDivider: this.container.querySelector('#roomDivider'),
			authSection: this.container.querySelector('#authSection'),
			alias: this.container.querySelector('#alias'),
			identityInputs: this.container.querySelector('#identityInputs'),
			identityStatus: this.container.querySelector('#identityStatus'),
			identityPill: this.container.querySelector('#identityPill'),
			identityName: this.container.querySelector('.identity-name'),
			createPair: this.container.querySelector('#createPair'),
			login: this.container.querySelector('#login'),
		};

		// Set initial room state to loading
		if (
			this.elements.roomLoading &&
			this.elements.roomInputs &&
			this.elements.roomStatus
		) {
			this.elements.roomLoading.style.display = 'flex';
			this.elements.roomInputs.style.display = 'none';
			this.elements.roomStatus.style.display = 'none';
		}

		// Check initial auth status and show identity if authenticated
		if (this.stateManager && this.stateManager.getState()) {
			const state = this.stateManager.getState();
			if (
				state.auth &&
				state.auth.status &&
				state.auth.alias &&
				state.auth.alias !== 'anon'
			) {
				this.updateAuthStatus(state.auth);
			}
		}
	}

	bindEvents() {
		// Connection events
		if (this.elements.connectBtn) {
			this.elements.connectBtn.addEventListener('click', () => {
				this.handleConnect();
			});
		}

		if (this.elements.disconnectBtn) {
			this.elements.disconnectBtn.addEventListener('click', () => {
				this.handleDisconnect();
			});
		}

		if (this.elements.testConnection) {
			this.elements.testConnection.addEventListener('click', () => {
				this.handleTestConnection();
			});
		}

		// Room events
		if (this.elements.join) {
			this.elements.join.addEventListener('click', () => {
				this.handleJoinRoom();
			});
		}
		if (this.elements.leave) {
			this.elements.leave.addEventListener('click', () => {
				document.dispatchEvent(new CustomEvent('ui:leaveRoom'));
			});
		}

		// Auth events
		if (this.elements.createPair) {
			this.elements.createPair.addEventListener('click', () => {
				this.handleCreateUser();
			});
		}

		if (this.elements.login) {
			this.elements.login.addEventListener('click', () => {
				this.handleLogin();
			});
		}

		// Listen for state changes
		document.addEventListener('stateChanged', (event) => {
			this.handleStateChange(event.detail);
		});

		// Make peer status pill clickable to show connection details
		if (this.elements.connectionStatus) {
			this.elements.connectionStatus.addEventListener('click', () => {
				// Only allow clicking when connected or partial (not when connecting/disconnected)
				const currentStatus =
					this.elements.connectionStatus.textContent;
				if (currentStatus.includes('Peers')) {
					document.dispatchEvent(
						new CustomEvent('ui:showConnectionDetails')
					);
				}
			});
		}
	}

	handleConnect() {
		// Use default peers since we're hiding the peer input field
		this.connection.updatePeers(this.connection.getDefaultPeers());
	}

	handleDisconnect() {
		this.connection.disconnect();
	}

	handleTestConnection() {
		// Test the connection
		this.connection.testConnection();
	}

	handleJoinRoom() {
		const roomName = this.elements.room.value.trim();
		if (roomName) {
			document.dispatchEvent(
				new CustomEvent('ui:joinRoom', { detail: roomName })
			);
		}
	}

	handleCreateUser() {
		const alias = this.elements.alias.value.trim();
		if (alias) {
			document.dispatchEvent(
				new CustomEvent('ui:createUser', { detail: alias })
			);
		}
	}

	handleLogin() {
		const alias = this.elements.alias.value.trim();
		if (alias) {
			document.dispatchEvent(
				new CustomEvent('ui:login', { detail: alias })
			);
		}
	}

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

	updateConnectionStatus(status, networkState = null) {
		if (!this.elements.connectionStatus) return;

		// Map status to display text with peer count
		let displayText = status;
		let statusClass = '';

		switch (status) {
			case 'connecting':
				displayText = 'Connecting...';
				statusClass = 'status-connecting';
				break;
			case 'connected':
			case 'partial':
				if (
					networkState &&
					networkState.connected !== undefined &&
					networkState.total !== undefined
				) {
					displayText =
						(status === 'connected' ? 'Connected' : 'Partial') +
						`: ${networkState.connected}/${networkState.total} Peers`;
					statusClass =
						status === 'connected'
							? 'status-connected'
							: 'status-partial';
				} else {
					displayText =
						status === 'connected' ? 'Connected' : 'Partial';
					statusClass =
						status === 'connected'
							? 'status-connected'
							: 'status-partial';
				}
				break;
			case 'disconnected':
				displayText = 'Disconnected';
				statusClass = 'status-disconnected';
				break;
		}

		this.elements.connectionStatus.textContent = displayText;

		// Update status classes for color coding
		this.elements.connectionStatus.className = `pill mono ${statusClass}`;

		// Show/hide connection controls based on status
		if (status === 'connected') {
			this.elements.connectionControls.style.display = 'none';
			this.elements.connectBtn.style.display = 'none';
			this.elements.disconnectBtn.style.display = 'inline-block';
			this.elements.testConnection.style.display = 'none'; // Only show disconnect button when connected

			// Show auth section immediately
			this.elements.authSection.style.visibility = 'visible';

			// Show room section but keep it in loading state
			this.elements.roomSection.style.visibility = 'visible';
			this.elements.roomDivider.style.visibility = 'visible';
		} else if (status === 'disconnected') {
			// Show only the buttons, not the peer input
			this.elements.peers.style.display = 'none';
			this.elements.connectBtn.style.display = 'inline-block';
			this.elements.disconnectBtn.style.display = 'none';
			this.elements.testConnection.style.display = 'inline-block';

			// Hide room section but show auth section if user is authenticated
			this.elements.roomSection.style.visibility = 'hidden';
			this.elements.roomDivider.style.visibility = 'hidden';
			// Don't hide auth section here - let updateAuthStatus handle it
		} else if (status === 'connecting') {
			// Hide all controls when connecting - only show the "Connecting..." pill
			this.elements.connectionControls.style.display = 'none';
			this.elements.connectBtn.style.display = 'none';
			this.elements.disconnectBtn.style.display = 'none';
			this.elements.testConnection.style.display = 'none';

			// Hide room section but show auth section if user is authenticated
			this.elements.roomSection.style.visibility = 'hidden';
			this.elements.roomDivider.style.visibility = 'hidden';
			// Don't hide auth section here - let updateAuthStatus handle it
		}
	}

	updateRoomStatus(status, roomState = null) {
		if (
			!this.elements.roomLoading ||
			!this.elements.roomInputs ||
			!this.elements.roomStatus
		)
			return;

		// Hide loading state when we get any room state
		this.elements.roomLoading.style.display = 'none';

		if (status === 'joining') {
			// Show joining state
			this.elements.roomInputs.style.display = 'none';
			this.elements.roomStatus.style.display = 'flex';

			// Update room pill to show joining
			if (this.elements.roomName) {
				this.elements.roomName.textContent = `Joining...`;
			}
		} else if (status === 'joined' && roomState && roomState.name) {
			// Show room status pill and leave button
			this.elements.roomInputs.style.display = 'none';
			this.elements.roomStatus.style.display = 'flex';

			// Update room pill content
			if (this.elements.roomName) {
				this.elements.roomName.textContent = roomState.name;
			}
		} else if (status === 'not_joined') {
			// Show room input and join button
			this.elements.roomInputs.style.display = 'flex';
			this.elements.roomStatus.style.display = 'none';
		}
	}

	updateAuthStatus(status) {
		if (!this.elements.identityInputs || !this.elements.identityStatus)
			return;

		if (status && status.alias && status.alias !== 'anon') {
			// Show identity status pill
			this.elements.identityInputs.style.display = 'none';
			this.elements.identityStatus.style.display = 'block';

			// Update identity pill content
			if (this.elements.identityName) {
				this.elements.identityName.textContent = status.alias;
			}

			// Show the entire auth section when authenticated
			if (this.elements.authSection) {
				this.elements.authSection.style.visibility = 'visible';
			}
		} else {
			// Show identity inputs and buttons
			this.elements.identityInputs.style.display = 'flex';
			this.elements.identityStatus.style.display = 'none';

			// Hide the entire auth section when not authenticated
			if (this.elements.authSection) {
				this.elements.authSection.style.visibility = 'hidden';
			}
		}
	}

	// Public methods for external updates
	setConnectionStatus(status) {
		this.updateConnectionStatus(status);
	}

	setRoomStatus(status) {
		this.updateRoomStatus(status);
	}

	setAuthStatus(status) {
		this.updateAuthStatus(status);
	}

	// Setup event handlers (called from main app)
	setupEventHandlers() {
		// Event handlers are already set up in bindEvents()
		// This method exists for compatibility with the main app
	}

	// Set initial values (called from main app)
	setInitialValues() {
		// Set initial peer values
		if (this.elements.peers && this.connection.getDefaultPeers) {
			this.elements.peers.value = this.connection
				.getDefaultPeers()
				.join(',');
		}

		// Render initial state if stateManager is available
		if (this.stateManager) {
			const state = this.stateManager.getState();
			this.renderInitialState(state);
		}
	}

	// Render initial state
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
