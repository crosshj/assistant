import { html } from '../_lib/utils.js';
import './Connection.css';

export class Connection {
	constructor() {
		this.modal = null;
		this.isOpen = false;
	}

	open() {
		if (this.isOpen) return;

		this.isOpen = true;
		this.render();
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
						<div class="collapsible-header">
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
	}

	// Get modal element for controller event delegation
	getModal() {
		return this.modal;
	}

	updatePeerTable(detailedPeers) {
		const tbody = this.modal?.querySelector('#peerTableBody');
		if (!tbody) return;

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

	updateConnectionStatus(networkState) {
		// Update the network status when connection status changes
		if (this.isOpen) {
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
	updateConnectionStats(networkInfo) {
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
	updatePeerLists(defaultPeers, currentPeers) {
		const defaultPeersList = this.modal?.querySelector('#defaultPeersList');
		const currentPeersList = this.modal?.querySelector('#currentPeersList');

		if (defaultPeersList) {
			defaultPeersList.innerHTML = defaultPeers
				.map((peer) => `<li>${peer}</li>`)
				.join('');
		}

		if (currentPeersList) {
			currentPeersList.innerHTML = currentPeers
				.map((peer) => `<li>${peer}</li>`)
				.join('');
		}
	}
}
