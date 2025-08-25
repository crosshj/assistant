import { html } from '../lib/utils.js';
import './ConnectionDetails.css';

export class ConnectionDetails {
	constructor(connection) {
		this.connection = connection;
		this.modal = null;
		this.isOpen = false;

		this.bindEvents();
	}

	bindEvents() {
		// Listen for state changes from the new state system
		document.addEventListener('stateChanged', (event) => {
			if (event.detail.network) {
				this.updateConnectionStatus(event.detail.network);
			}
		});

		// Listen for external open requests
		document.addEventListener('ui:showConnectionDetails', () => {
			this.open();
		});
	}

	open() {
		if (this.isOpen) return;

		this.isOpen = true;
		this.render();
		this.bindModalEvents();
	}

	close() {
		if (!this.isOpen) return;

		this.isOpen = false;
		if (this.modal) {
			this.modal.remove();
			this.modal = null;
		}
	}

	render() {
		// Create modal overlay
		this.modal = document.createElement('div');
		this.modal.className = 'modal-overlay';
		this.modal.innerHTML = html`
			<div class="modal-content">
				<div class="modal-header">
					<h3>Connection Details</h3>
					<button
						class="modal-close"
						aria-label="Close"
					>
						&times;
					</button>
				</div>

				<div class="peer-modal-content">
					<!-- Network Status Section -->
					<div class="network-status-section">
						<label>Network Status</label>
						<div class="status-indicator">
							<span class="status-icon">✔</span>
							<span class="status-text">CONNECTED</span>
						</div>
					</div>

					<!-- Peer Configuration Section -->
					<div class="peer-config-section collapsed">
						<div
							class="collapsible-header"
							onclick="this.parentElement.classList.toggle('collapsed')"
						>
							<span class="collapsible-icon">►</span>
							<span>Peer Configuration</span>
						</div>
						<div class="collapsible-content">
							<div class="peer-lists">
								<div class="peer-list-section">
									<h4>Default Peers</h4>
									<ul id="defaultPeersList">
										<!-- Will be populated dynamically -->
									</ul>
								</div>
								<div class="peer-list-section">
									<h4>Current Peers</h4>
									<ul id="currentPeersList">
										<!-- Will be populated dynamically -->
									</ul>
								</div>
							</div>
						</div>
					</div>

					<!-- Connection Summary Statistics -->
					<div class="connection-stats">
						<div class="stat-item">
							<label>Connection Rate</label>
							<span id="connectionRate">100% (2/2)</span>
						</div>
						<div class="stat-item">
							<label>Stable Peers</label>
							<span id="stablePeers">0/2 connected</span>
						</div>
						<div class="stat-item">
							<label>Manual Disconnect</label>
							<span id="manualDisconnect">No</span>
						</div>
					</div>

					<!-- Detailed Peer Table -->
					<div class="peer-table-section">
						<table class="peer-table">
							<thead>
								<tr>
									<th>Status</th>
									<th>Ready State</th>
									<th>URL</th>
									<th>Connection Type</th>
									<th>Stability</th>
									<th>Last Activity</th>
								</tr>
							</thead>
							<tbody id="peerTableBody">
								<tr>
									<td
										colspan="6"
										style="text-align: center; color: var(--text-muted);"
									>
										Loading peer information...
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- Action Buttons -->
					<div class="action-buttons">
						<button
							id="refreshBtn"
							class="secondary"
						>
							Refresh
						</button>
						<button
							id="networkDiscoveryBtn"
							class="secondary"
						>
							Network Discovery
						</button>
					</div>
				</div>
			</div>
		`;

		document.body.appendChild(this.modal);
		this.updatePeerTable();
		this.updateConnectionStats();
		this.updatePeerLists();
		this.bindActionButtons();
	}

	bindModalEvents() {
		// Close button
		const closeBtn = this.modal.querySelector('.modal-close');
		if (closeBtn) {
			closeBtn.addEventListener('click', () => {
				this.close();
			});
		}

		// Click outside to close
		this.modal.addEventListener('click', (event) => {
			if (event.target === this.modal) {
				this.close();
			}
		});

		// Escape key to close
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && this.isOpen) {
				this.close();
			}
		});
	}

	updatePeerTable() {
		const tbody = this.modal?.querySelector('#peerTableBody');
		if (!tbody) return;

		// Get detailed peer information from connection
		const detailedPeers = this.connection.getDetailedPeerInfo
			? this.connection.getDetailedPeerInfo()
			: {};

		const peerEntries = Object.entries(detailedPeers);
		if (peerEntries.length === 0) {
			tbody.innerHTML = `
				<tr>
					<td colspan="6" style="text-align: center; color: var(--text-muted);">
						No peers configured
					</td>
				</tr>
			`;
			return;
		}

		tbody.innerHTML = peerEntries
			.map(
				([peerId, peer]) => `
			<tr>
				<td>
					<span class="status-${peer.isConnected ? 'connected' : 'disconnected'}">
						${peer.isConnected ? 'Connected' : 'Disconnected'}
					</span>
				</td>
				<td>${this.getReadyStateText(peer.readyState)}</td>
				<td>${peer.url || peer.id || 'Unknown'}</td>
				<td>${this.getConnectionType(peer.wire)}</td>
				<td>
					<span class="stability-${
						peer.stability.connected ? 'connected' : 'disconnected'
					}">
						${peer.stability.connected ? 'Connected' : 'Disconnected'}
					</span>
				</td>
				<td>${
					peer.lastActivity.connected
						? new Date(peer.lastActivity.connected).toLocaleString()
						: 'Unknown'
				}</td>
			</tr>
		`
			)
			.join('');
	}

	bindPeerActionEvents() {
		// This would handle peer-specific actions like test, disconnect, etc.
		// For now, we'll just log the actions
		const actionButtons = this.modal?.querySelectorAll(
			'button[onclick*="handlePeerAction"]'
		);
		if (actionButtons) {
			actionButtons.forEach((button) => {
				button.addEventListener('click', (event) => {
					event.preventDefault();
					const onclick = button.getAttribute('onclick');
					const match = onclick.match(
						/handlePeerAction\('([^']+)', '([^']+)'\)/
					);
					if (match) {
						this.handlePeerAction(match[1], match[2]);
					}
				});
			});
		}
	}

	handlePeerAction(peerId, action) {
		switch (action) {
			case 'test':
				this.testPeer(peerId);
				break;
			case 'disconnect':
				this.disconnectPeer(peerId);
				break;
			default:
			// Unknown peer action
		}
	}

	testPeer(peerId) {
		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('peer:test', {
				detail: { peerId: peerId },
			})
		);
	}

	disconnectPeer(peerId) {
		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('peer:disconnect', {
				detail: { peerId: peerId },
			})
		);
	}

	updateConnectionStatus(networkState) {
		// Update the peer table when connection status changes
		if (this.isOpen) {
			this.updatePeerTable();
			this.updateConnectionStats();
			this.updateNetworkStatus(networkState);
		}
	}

	updateNetworkStatus(networkState) {
		const statusIcon = this.modal?.querySelector('.status-icon');
		const statusText = this.modal?.querySelector('.status-text');

		if (!statusIcon || !statusText) return;

		if (networkState.status === 'connected') {
			statusIcon.textContent = '✔';
			statusIcon.style.color = '#10b981';
			statusText.textContent = 'CONNECTED';
			statusText.style.color = '#10b981';
		} else if (networkState.status === 'partial') {
			statusIcon.textContent = '⚠';
			statusIcon.style.color = '#f59e0b';
			statusText.textContent = 'PARTIAL';
			statusText.style.color = '#f59e0b';
		} else if (networkState.status === 'connecting') {
			statusIcon.textContent = '⟳';
			statusIcon.style.color = '#3b82f6';
			statusText.textContent = 'CONNECTING';
			statusText.style.color = '#3b82f6';
		} else {
			statusIcon.textContent = '✗';
			statusIcon.style.color = '#ef4444';
			statusText.textContent = 'DISCONNECTED';
			statusText.style.color = '#ef4444';
		}
	}

	// Public methods for external access
	isModalOpen() {
		return this.isOpen;
	}

	refresh() {
		if (this.isOpen) {
			this.updatePeerTable();
		}
	}

	// Helper methods for peer information display
	getReadyStateText(readyState) {
		switch (readyState) {
			case 0:
				return 'CONNECTING';
			case 1:
				return 'OPEN';
			case 2:
				return 'CLOSING';
			case 3:
				return 'CLOSED';
			default:
				return 'UNKNOWN';
		}
	}

	getConnectionType(wire) {
		if (!wire) return 'Unknown';
		// WebSocket is the most common type for GunDB
		return 'WebSocket';
	}

	// Update connection statistics
	updateConnectionStats() {
		const networkInfo = this.connection.getNetworkInfo
			? this.connection.getNetworkInfo()
			: {};

		const connectionRateEl = this.modal?.querySelector('#connectionRate');
		const stablePeersEl = this.modal?.querySelector('#stablePeers');
		const manualDisconnectEl =
			this.modal?.querySelector('#manualDisconnect');

		if (connectionRateEl) {
			const rate = networkInfo.connectionRate || 0;
			const connected = networkInfo.connectedPeers || 0;
			const total = networkInfo.totalPeers || 0;
			connectionRateEl.textContent = `${Math.round(
				rate
			)}% (${connected}/${total})`;
		}

		if (stablePeersEl) {
			const stable = networkInfo.stablePeers || 0;
			const total = networkInfo.totalPeers || 0;
			stablePeersEl.textContent = `${stable}/${total} connected`;
		}

		if (manualDisconnectEl) {
			manualDisconnectEl.textContent = networkInfo.isDisconnected
				? 'Yes'
				: 'No';
		}
	}

	// Update peer configuration lists
	updatePeerLists() {
		const defaultPeersList = this.modal?.querySelector('#defaultPeersList');
		const currentPeersList = this.modal?.querySelector('#currentPeersList');

		if (defaultPeersList) {
			const defaultPeers = this.connection.getDefaultPeers
				? this.connection.getDefaultPeers()
				: [];
			defaultPeersList.innerHTML = defaultPeers
				.map((peer) => `<li>${peer}</li>`)
				.join('');
		}

		if (currentPeersList) {
			const currentPeers = this.connection.peers || [];
			currentPeersList.innerHTML = currentPeers
				.map((peer) => `<li>${peer}</li>`)
				.join('');
		}
	}

	// Bind action button events
	bindActionButtons() {
		const refreshBtn = this.modal?.querySelector('#refreshBtn');
		const networkDiscoveryBtn = this.modal?.querySelector(
			'#networkDiscoveryBtn'
		);

		if (refreshBtn) {
			refreshBtn.addEventListener('click', () => {
				this.updatePeerTable();
				this.updateConnectionStats();
				this.updatePeerLists();
			});
		}

		if (networkDiscoveryBtn) {
			networkDiscoveryBtn.addEventListener('click', () => {
				// Dispatch event for network discovery
				document.dispatchEvent(new CustomEvent('ui:networkDiscovery'));
			});
		}
	}

	// Method to get current peer information
	getPeerInfo() {
		return this.connection.getPeers ? this.connection.getPeers() : [];
	}
}
