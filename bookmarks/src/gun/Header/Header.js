import { html } from '../_lib/utils.js';
import './Header.css';

export class Header {
	constructor({ controller }) {
		this.controller = controller;
		this.container = null;
		this.elements = {};

		this.render();
		this.setupEventListeners();
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
			<div class="header-row">
				<!-- Network/Connection Section (FIRST position - always visible) -->
				<div
					class="header-row-item network-section"
					id="networkSection"
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
						class="connection-controls"
						id="connectionControls"
					>
						<input
							id="peers"
							class="input-size-40"
							placeholder="Peer URLs"
						/>
					</div>

					<!-- Connect Button (shown when disconnected or partial) -->
					<button
						id="connectBtn"
						class="primary connect-btn"
					>
						Connect
					</button>

					<!-- Disconnect Button (shown when connected) -->
					<button
						id="disconnectBtn"
						class="secondary disconnect-btn"
					>
						Disconnect
					</button>

					<!-- Test Button (shown when needed) -->
					<button
						id="testConnection"
						class="secondary test-btn"
					>
						Test
					</button>
				</div>

				<div class="header-divider"></div>

				<!-- Room Management Section (SECOND position, hidden when not connected) -->
				<div
					class="header-row-item room-section"
					id="roomSection"
				>
					<strong>Graph</strong>
					<!-- Loading state (shown initially) -->
					<div
						class="room-loading"
						id="roomLoading"
					>
						<span class="loading-text">Loading...</span>
					</div>
					<!-- Room input and join button (shown when not in a room) -->
					<div
						class="room-inputs"
						id="roomInputs"
					>
						<input
							id="room"
							class="input-size-14"
							placeholder="graph-name"
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
						class="room-status"
						id="roomStatus"
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
					class="header-divider room-divider"
					id="roomDivider"
				></div>

				<!-- Authentication Section (visibility controlled by auth status) -->
				<div
					class="header-row-item auth-section"
					id="authSection"
				>
					<strong>Identity</strong>
					<!-- Identity inputs and buttons (shown when not authenticated) -->
					<div
						class="identity-inputs"
						id="identityInputs"
					>
						<input
							id="alias"
							class="input-size-10"
							placeholder="alias"
						/>
						<button id="createPair">New ID</button>
						<button id="login">Login</button>
					</div>
					<!-- Identity status pill (shown when authenticated) -->
					<div
						class="identity-status"
						id="identityStatus"
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
			this.elements.roomLoading.classList.add('visible');
			this.elements.roomInputs.classList.remove('room-inputs--visible');
			this.elements.roomStatus.classList.remove('room-status--visible');
		}
	}

	setupEventListeners() {
		// Connection events
		if (this.elements.connectBtn) {
			this.elements.connectBtn.addEventListener('click', () => {
				this.controller.handleConnect();
			});
		}

		if (this.elements.disconnectBtn) {
			this.elements.disconnectBtn.addEventListener('click', () => {
				this.controller.handleDisconnect();
			});
		}

		if (this.elements.testConnection) {
			this.elements.testConnection.addEventListener('click', () => {
				this.controller.handleTestConnection();
			});
		}

		// Room events
		if (this.elements.join) {
			this.elements.join.addEventListener('click', () => {
				const roomName = this.elements.room.value.trim();
				if (roomName) {
					this.controller.handleJoinRoom(roomName);
				}
			});
		}
		if (this.elements.leave) {
			this.elements.leave.addEventListener('click', () => {
				this.controller.handleLeaveRoom();
			});
		}

		// Auth events
		if (this.elements.createPair) {
			this.elements.createPair.addEventListener('click', () => {
				const alias = this.elements.alias.value.trim();
				if (alias) {
					this.controller.handleCreateUser(alias);
				}
			});
		}

		if (this.elements.login) {
			this.elements.login.addEventListener('click', () => {
				const alias = this.elements.alias.value.trim();
				if (alias) {
					this.controller.handleLogin(alias);
				}
			});
		}

		// Make peer status pill clickable to show connection details
		if (this.elements.connectionStatus) {
			this.elements.connectionStatus.addEventListener('click', () => {
				// Only allow clicking when connected or partial (not when connecting/disconnected)
				const currentStatus =
					this.elements.connectionStatus.textContent;
				if (currentStatus.includes('Peers')) {
					this.controller.handleShowConnectionDetails();
				}
			});
		}
	}

	// ===== PUBLIC UPDATE METHODS FOR CONTROLLER TO CALL =====

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
				// Don't show "Disconnected" pill - just show the connect button
				displayText = '';
				statusClass = '';
				break;
		}

		// Hide the pill completely when disconnected, show it otherwise
		if (status === 'disconnected' || !displayText) {
			this.elements.connectionStatus.classList.add('hidden');
		} else {
			this.elements.connectionStatus.classList.remove('hidden');
			this.elements.connectionStatus.textContent = displayText;
			// Update status classes for color coding
			this.elements.connectionStatus.className = `pill mono ${statusClass}`;
		}

		// Show/hide connection controls based on status
		if (status === 'connected') {
			this.elements.connectionControls.classList.remove(
				'connection-controls--visible'
			);
			this.elements.connectBtn.classList.remove('connect-btn--visible');
			this.elements.disconnectBtn.classList.add(
				'disconnect-btn--visible'
			);
			this.elements.testConnection.classList.remove('test-btn--visible'); // Only show disconnect button when connected

			// Show auth section immediately
			this.elements.authSection.classList.remove('auth-section--hidden');

			// Show room section but keep it in loading state
			this.elements.roomSection.classList.add('room-section--visible');
			this.elements.roomDivider.classList.add('room-divider--visible');

			// Show the room pane when connected
			document.dispatchEvent(new CustomEvent('ui:roomPaneConnected'));
		} else if (status === 'disconnected') {
			// Show only the buttons, not the peer input
			this.elements.connectionControls.classList.remove(
				'connection-controls--visible'
			);
			this.elements.connectBtn.classList.add('connect-btn--visible');
			this.elements.disconnectBtn.classList.remove(
				'disconnect-btn--visible'
			);
			this.elements.testConnection.classList.add('test-btn--visible');

			// Hide room section but show auth section if user is authenticated
			this.elements.roomSection.classList.remove('room-section--visible');
			this.elements.roomDivider.classList.remove('room-divider--visible');

			// Reset auth status to not authenticated when disconnected
			this.updateAuthStatus(null);

			// Hide the room pane when disconnected
			document.dispatchEvent(new CustomEvent('ui:roomPaneDisconnected'));
		} else if (status === 'connecting') {
			// Hide all controls when connecting - only show the "Connecting..." pill
			this.elements.connectionControls.classList.remove(
				'connection-controls--visible'
			);
			this.elements.connectBtn.classList.remove('connect-btn--visible');
			this.elements.disconnectBtn.classList.remove(
				'disconnect-btn--visible'
			);
			this.elements.testConnection.classList.remove('test-btn--visible');

			// Hide room section but show auth section if user is authenticated
			this.elements.roomSection.classList.remove('room-section--visible');
			this.elements.roomDivider.classList.remove('room-divider--visible');
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
		this.elements.roomLoading.classList.remove('visible');

		if (status === 'joining') {
			// Show joining state
			this.elements.roomInputs.classList.remove('room-inputs--visible');
			this.elements.roomStatus.classList.add('room-status--visible');

			// Update room pill to show joining
			if (this.elements.roomName) {
				this.elements.roomName.textContent = `Joining...`;
			}
		} else if (status === 'joined' && roomState && roomState.name) {
			// Show room status pill and leave button
			this.elements.roomInputs.classList.remove('room-inputs--visible');
			this.elements.roomStatus.classList.add('room-status--visible');

			// Update room pill content
			if (this.elements.roomName) {
				this.elements.roomName.textContent = roomState.name;
			}
		} else if (status === 'not_joined') {
			// Show room input and join button
			this.elements.roomInputs.classList.add('room-inputs--visible');
			this.elements.roomStatus.classList.remove('room-status--visible');
		}
	}

	updateAuthStatus(status) {
		if (!this.elements.identityInputs || !this.elements.identityStatus)
			return;

		if (status && status.alias && status.alias !== 'anon') {
			// Show identity status pill
			this.elements.identityInputs.classList.add('hidden');
			this.elements.identityStatus.classList.add(
				'identity-status--visible'
			);

			// Update identity pill content
			if (this.elements.identityName) {
				this.elements.identityName.textContent = status.alias;
			}

			// Show the entire auth section when authenticated
			if (this.elements.authSection) {
				this.elements.authSection.classList.remove(
					'auth-section--hidden'
				);
			}
		} else {
			// Show identity inputs and buttons
			this.elements.identityInputs.classList.remove('hidden');
			this.elements.identityStatus.classList.remove(
				'identity-status--visible'
			);

			// Hide the entire auth section when not authenticated
			if (this.elements.authSection) {
				this.elements.authSection.classList.add('auth-section--hidden');
			}
		}
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

	setInitialPeers(peers) {
		if (this.elements.peers) {
			this.elements.peers.value = peers;
		}
	}
}
