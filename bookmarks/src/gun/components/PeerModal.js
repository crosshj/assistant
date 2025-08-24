/**
 * Peer Modal Component
 * Displays detailed information about all peers in a table format
 */
export class PeerModal {
	constructor() {
		this.modal = null;
		this.isOpen = false;
		this.init();
	}

	init() {
		this.createModal();
		this.bindEvents();
	}

	createModal() {
		// Create modal container
		this.modal = document.createElement('div');
		this.modal.className = 'peer-modal';
		this.modal.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.5);
			display: none;
			justify-content: center;
			align-items: center;
			z-index: 1000;
		`;

		// Create modal content
		const modalContent = document.createElement('div');
		modalContent.className = 'peer-modal-content';
		modalContent.style.cssText = `
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: var(--card-radius);
			padding: 24px;
			max-width: 1200px;
			width: min(95vw, 1200px);
			max-height: 80vh;
			overflow-y: auto;
			box-shadow: var(--card-shadow);
			position: relative;
			color: var(--text-bright);
		`;

		// Create header
		const header = document.createElement('div');
		header.className = 'peer-modal-header';
		header.style.cssText = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 16px;
			padding-bottom: 12px;
			border-bottom: 1px solid var(--card-border);
		`;

		const title = document.createElement('h2');
		title.className = 'peer-modal-title';
		title.textContent = 'Peer Information';
		title.style.cssText = `
			margin: 0;
			font-size: 20px;
			font-weight: 700;
			color: var(--text-bright);
		`;

		const closeBtn = document.createElement('button');
		closeBtn.className = 'peer-modal-close secondary';
		closeBtn.innerHTML = '&times;';
		closeBtn.style.cssText = `
			background: transparent;
			border: 1px solid var(--card-border);
			font-size: 20px;
			cursor: pointer;
			color: var(--text-bright);
			padding: 0;
			width: 32px;
			height: 32px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 6px;
		`;

		// Hover effect aligns with app button hover
		closeBtn.addEventListener('mouseenter', () => {
			closeBtn.style.backgroundColor =
				'color-mix(in srgb, var(--accent) 10%, var(--card-bg))';
			closeBtn.style.borderColor = 'var(--accent)';
		});

		closeBtn.addEventListener('mouseleave', () => {
			closeBtn.style.backgroundColor = 'transparent';
			closeBtn.style.borderColor = 'var(--card-border)';
		});

		header.appendChild(title);
		header.appendChild(closeBtn);

		// Create table container
		const tableContainer = document.createElement('div');
		tableContainer.className = 'peer-table-container';
		tableContainer.style.cssText = `
			overflow-x: auto;
		`;

		// Create table
		this.table = document.createElement('table');
		this.table.className = 'peer-table';
		this.table.style.cssText = `
			width: 100%;
			border-collapse: collapse;
			font-size: 0.92rem;
		`;

		// Create table header
		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		headerRow.style.cssText = `
			background: color-mix(in srgb, var(--card-border) 50%, var(--card-bg));
			border-bottom: 1px solid var(--card-border);
		`;

		const headers = [
			'Status',
			'Ready State',
			'URL',
			'Connection Type',
			'Stability',
			'Last Activity',
		];
		headers.forEach((headerText) => {
			const th = document.createElement('th');
			th.textContent = headerText;
			th.style.cssText = `
				padding: 10px 12px;
				text-align: left;
				font-weight: 600;
				color: var(--text-subtle);
				border-bottom: 1px solid var(--card-border);
			`;
			headerRow.appendChild(th);
		});

		thead.appendChild(headerRow);
		this.table.appendChild(thead);

		// Create table body
		this.tbody = document.createElement('tbody');
		this.table.appendChild(this.tbody);

		tableContainer.appendChild(this.table);

		// Create empty state message
		this.emptyState = document.createElement('div');
		this.emptyState.textContent = 'No peer information available';
		this.emptyState.style.cssText = `
			text-align: center;
			padding: 40px;
			color: var(--text-muted);
			font-style: italic;
		`;
		this.emptyState.style.display = 'none';
		tableContainer.appendChild(this.emptyState);

		// Create refresh button
		const refreshBtn = document.createElement('button');
		refreshBtn.textContent = 'Refresh';
		refreshBtn.className = 'secondary';
		refreshBtn.style.cssText = `
			margin-top: 16px;
		`;

		// Assemble modal
		modalContent.appendChild(header);
		modalContent.appendChild(tableContainer);
		modalContent.appendChild(refreshBtn);
		this.modal.appendChild(modalContent);

		// Add to document
		document.body.appendChild(this.modal);

		// Store references
		this.closeBtn = closeBtn;
		this.refreshBtn = refreshBtn;
	}

	bindEvents() {
		// Close modal on close button click
		this.closeBtn.addEventListener('click', () => {
			this.close();
		});

		// Close modal on background click
		this.modal.addEventListener('click', (e) => {
			if (e.target === this.modal) {
				this.close();
			}
		});

		// Close modal on escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.isOpen) {
				this.close();
			}
		});

		// Refresh button click
		this.refreshBtn.addEventListener('click', () => {
			this.refresh();
		});
	}

	open(peerData) {
		this.isOpen = true;
		this.modal.style.display = 'flex';
		this.updateTable(peerData);
	}

	close() {
		this.isOpen = false;
		this.modal.style.display = 'none';
	}

	refresh() {
		// Emit refresh event for parent to handle
		this.modal.dispatchEvent(new CustomEvent('refreshPeers'));
	}

	updateTable(peerData) {
		if (!peerData || Object.keys(peerData).length === 0) {
			this.showEmptyState();
			return;
		}

		this.hideEmptyState();
		this.tbody.innerHTML = '';

		Object.entries(peerData).forEach(([peerId, peer]) => {
			const row = this.createPeerRow(peerId, peer);
			this.tbody.appendChild(row);
		});
	}

	createPeerRow(peerId, peer) {
		console.log({ peer });
		const row = document.createElement('tr');
		row.style.cssText = `
			border-bottom: 1px solid var(--card-border);
			transition: background-color 0.15s ease;
		`;

		row.addEventListener('mouseenter', () => {
			row.style.backgroundColor =
				'color-mix(in srgb, var(--card-border) 50%, var(--card-bg))';
		});

		row.addEventListener('mouseleave', () => {
			row.style.backgroundColor = 'transparent';
		});

		// Status cell
		const statusCell = document.createElement('td');
		const status = this.getPeerStatus(peer);
		statusCell.innerHTML = status.html;
		statusCell.style.cssText = `
			padding: 10px 12px;
			vertical-align: middle;
		`;

		// Ready State cell
		const readyCell = document.createElement('td');
		const rs = this.getReadyState(peer);
		const rsLabel =
			typeof rs === 'number' ? this.getReadyStateLabel(rs) : 'Unknown';
		readyCell.textContent = rsLabel;
		readyCell.title = typeof rs === 'number' ? String(rs) : 'N/A';
		readyCell.style.cssText = `
			padding: 10px 12px;
			vertical-align: middle;
			font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		`;

		// URL cell
		const urlCell = document.createElement('td');
		urlCell.textContent = peer.url || 'Unknown';
		urlCell.style.cssText = `
			padding: 10px 12px;
			vertical-align: middle;
			font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
			font-size: 0.88rem;
			max-width: 260px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		`;
		urlCell.title = peer.url || 'Unknown';

		// Connection Type cell
		const typeCell = document.createElement('td');
		typeCell.textContent = this.getConnectionType(peer);
		typeCell.style.cssText = `
			padding: 10px 12px;
			vertical-align: middle;
			text-transform: capitalize;
		`;

		// Stability cell
		const stabilityCell = document.createElement('td');
		const stability = this.getPeerStability(peer);
		stabilityCell.innerHTML = stability.html;
		stabilityCell.style.cssText = `
			padding: 10px 12px;
			vertical-align: middle;
		`;

		// Last Activity cell
		const activityCell = document.createElement('td');
		activityCell.textContent = this.getLastActivity(peer);
		activityCell.style.cssText = `
			padding: 10px 12px;
			vertical-align: middle;
			font-size: 0.88rem;
			color: var(--text-muted);
		`;

		row.appendChild(statusCell);
		row.appendChild(readyCell);
		row.appendChild(urlCell);
		row.appendChild(typeCell);
		row.appendChild(stabilityCell);
		row.appendChild(activityCell);

		return row;
	}

	getPeerStatus(peer) {
		if (!peer || !peer.wire) {
			return {
				html: '<span>❌ Disconnected</span>',
				status: 'disconnected',
			};
		}

		const readyState = peer.wire.readyState;
		switch (readyState) {
			case 0: // CONNECTING
				return {
					html: '<span>🔄 Connecting</span>',
					status: 'connecting',
				};
			case 1: // OPEN
				return {
					html: '<span>✅ Connected</span>',
					status: 'connected',
				};
			case 2: // CLOSING
				return {
					html: '<span>⏳ Closing</span>',
					status: 'closing',
				};
			case 3: // CLOSED
				return {
					html: '<span>❌ Closed</span>',
					status: 'closed',
				};
			default:
				return {
					html: '<span>❓ Unknown</span>',
					status: 'unknown',
				};
		}
	}

	getReadyState(peer) {
		if (!peer) return 'N/A';
		const rs =
			peer.readyState !== undefined
				? peer.readyState
				: peer.wire && peer.wire.readyState !== undefined
				? peer.wire.readyState
				: undefined;
		return rs !== undefined ? rs : 'N/A';
	}

	getReadyStateLabel(rs) {
		switch (rs) {
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

	getConnectionType(peer) {
		if (!peer || !peer.wire) return 'None';

		// Check if it's a WebSocket connection
		if (peer.wire.readyState !== undefined) {
			return 'WebSocket';
		}

		// Could be other types in the future
		return 'Unknown';
	}

	getPeerStability(peer) {
		if (!peer || !peer.stability) {
			return {
				html: '<span style="color: var(--text-muted);">N/A</span>',
			};
		}

		const { connected, stable, stableTime } = peer.stability;

		if (!connected) {
			return {
				html: '<span>❌ Disconnected</span>',
			};
		}

		if (stable) {
			const seconds = Math.floor(stableTime / 1000);
			const minutes = Math.floor(seconds / 60);
			const hours = Math.floor(minutes / 60);

			let timeText;
			if (hours > 0) {
				timeText = `${hours}h ${minutes % 60}m`;
			} else if (minutes > 0) {
				timeText = `${minutes}m ${seconds % 60}s`;
			} else {
				timeText = `${seconds}s`;
			}

			return {
				html: `<span>✅ Stable (${timeText})</span>`,
			};
		} else {
			return {
				html: '<span>🔄 Stabilizing</span>',
			};
		}
	}

	getLastActivity(peer) {
		if (!peer || !peer.lastActivity) return 'Never';

		const { connected, disconnected } = peer.lastActivity;
		const timestamp = connected || disconnected;

		if (!timestamp) return 'Unknown';

		const now = Date.now();
		const diff = now - timestamp;
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ago`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s ago`;
		} else if (seconds > 0) {
			return `${seconds}s ago`;
		} else {
			return 'Just now';
		}
	}

	showEmptyState() {
		this.table.style.display = 'none';
		this.emptyState.style.display = 'block';
	}

	hideEmptyState() {
		this.table.style.display = 'table';
		this.emptyState.style.display = 'none';
	}

	destroy() {
		if (this.modal && this.modal.parentNode) {
			this.modal.parentNode.removeChild(this.modal);
		}
	}
}
