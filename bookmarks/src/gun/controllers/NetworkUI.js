/**
 * Network UI Controller
 * Pure UI rendering based on state - no business logic
 */
import { PeerModal } from '../components/PeerModal.js';

export class NetworkUI {
	constructor() {
		this.elements = null;
		this.peerModal = null;
		this.connection = null;
	}

	setConnection(connection) {
		this.connection = connection;
	}

	_getElements() {
		const needsQuery =
			!this.elements ||
			!this.elements.status ||
			!this.elements.connectBtn ||
			!this.elements.disconnectBtn ||
			!this.elements.testBtn ||
			!this.elements.connectionControls;
		if (needsQuery) {
			this.elements = {
				status: document.getElementById('connectionStatus'),
				connectBtn: document.getElementById('connectBtn'),
				disconnectBtn: document.getElementById('disconnectBtn'),
				testBtn: document.getElementById('testConnection'),
				connectionControls:
					document.getElementById('connectionControls'),
			};
		}
		return this.elements;
	}

	// Initialize the peer modal and make status clickable
	init() {
		if (!this.peerModal) {
			this.peerModal = new PeerModal();
		}
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () =>
				this.makeStatusClickable()
			);
		} else {
			this.makeStatusClickable();
		}
	}

	makeStatusClickable() {
		const elements = this._getElements();
		if (elements.status) {
			elements.status.style.cursor = 'pointer';
			elements.status.title = 'Click to view detailed peer information';

			if (!elements.status._peerModalBound) {
				elements.status.addEventListener('click', () => {
					this.openPeerModal();
				});
				// Add hover effect
				elements.status.addEventListener('mouseenter', () => {
					elements.status.style.opacity = '0.8';
				});
				elements.status.addEventListener('mouseleave', () => {
					elements.status.style.opacity = '1';
				});
				// Mark as bound to avoid duplicate listeners
				elements.status._peerModalBound = true;
			}
		}
	}

	openPeerModal() {
		if (!this.connection) {
			console.warn('NetworkUI: Connection service not available');
			return;
		}

		const peerData = this.connection.getDetailedPeerInfo();
		const networkInfo = this.connection.getNetworkInfo();
		this.peerModal.open(peerData, networkInfo);

		// Listen for refresh events
		this.peerModal.modal.addEventListener('refreshPeers', () => {
			const updatedPeerData = this.connection.getDetailedPeerInfo();
			const updatedNetworkInfo = this.connection.getNetworkInfo();
			this.peerModal.updateNetworkInfo(updatedNetworkInfo);
			this.peerModal.updateTable(updatedPeerData);
		});
	}

	// Render UI based on network state
	render(networkState) {
		switch (networkState.status) {
			case 'disconnected':
				this._renderDisconnected(networkState);
				break;
			case 'connecting':
				this._renderConnecting(networkState);
				break;
			case 'partial':
				this._renderPartial(networkState);
				break;
			case 'connected':
				this._renderConnected(networkState);
				break;
		}
	}

	_renderDisconnected(state) {
		const elements = this._getElements();
		// Status: Hidden - user can infer from UI state
		elements.status.style.display = 'none';

		// Buttons: Blue Connect + Outlined Test
		elements.connectBtn.style.display = 'inline-block';
		elements.connectBtn.className = 'primary';
		elements.connectBtn.style.backgroundColor = '';
		elements.connectBtn.style.color = '';

		elements.testBtn.style.display = 'inline-block';
		elements.testBtn.className = 'secondary';
		elements.testBtn.style.backgroundColor = '';
		elements.testBtn.style.color = '';

		elements.disconnectBtn.style.display = 'none';
		elements.connectionControls.style.display = 'none';
	}

	_renderConnecting(state) {
		const elements = this._getElements();
		// Status: Connecting with orange styling
		elements.status.style.display = 'inline-block';
		elements.status.textContent = 'Connecting...';
		// elements.status.style.color = '#ffa726';
		// elements.status.style.borderColor = '#ffa726';

		// Hide all buttons during connection
		elements.connectBtn.style.display = 'none';
		elements.testBtn.style.display = 'none';
		elements.disconnectBtn.style.display = 'none';
		elements.connectionControls.style.display = 'none';
	}

	_renderPartial(state) {
		const elements = this._getElements();
		// Status: Warning with peer count
		elements.status.style.display = 'inline-block';
		elements.status.textContent = `Partial: ${state.connected}/${state.total} peers`;
		elements.status.style.color = '#ffa726';
		elements.status.style.borderColor = '#ffa726';

		// Only disconnect button visible
		elements.connectBtn.style.display = 'none';
		elements.testBtn.style.display = 'none';
		elements.disconnectBtn.style.display = 'inline-block';
		elements.connectionControls.style.display = 'none';
	}

	_renderConnected(state) {
		const elements = this._getElements();
		// Status: Success with peer count
		elements.status.style.display = 'inline-block';
		elements.status.textContent = `Connected: ${state.connected}/${state.total} peers`;
		elements.status.style.color = '#66bb6b';
		elements.status.style.borderColor = '#66bb6b';

		// Only disconnect button visible
		elements.connectBtn.style.display = 'none';
		elements.testBtn.style.display = 'none';
		elements.disconnectBtn.style.display = 'inline-block';
		elements.connectionControls.style.display = 'none';
	}
}
