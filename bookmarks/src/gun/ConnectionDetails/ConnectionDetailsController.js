import { log, addEventListener, dispatchEvent } from '../lib/utils.js';
import { ConnectionDetails } from './ConnectionDetails.js';

/**
 * ConnectionDetailsController
 * Handles all connection details modal events and business logic
 * Coordinates between UI component and connection service
 */
export class ConnectionDetailsController {
	constructor() {
		this.connection = null;

		// Create ConnectionDetails component (pure UI renderer)
		this.ui = new ConnectionDetails();

		// Bind controller methods
		this.handleRefresh = this.handleRefresh.bind(this);
		this.handleNetworkDiscovery = this.handleNetworkDiscovery.bind(this);
		this.handleModalOpen = this.handleModalOpen.bind(this);
		this.handleModalClose = this.handleModalClose.bind(this);
		this.handleEscapeKey = this.handleEscapeKey.bind(this);

		// Setup event listeners
		this.setupEventListeners();
	}

	setConnection(connection) {
		this.connection = connection;
	}

	setupEventListeners() {
		// External events to show/hide modal
		addEventListener('ui:showConnectionDetails', this.handleModalOpen);

		// Listen for network events from EventCoordinator
		addEventListener('network:connecting', () => {
			this.handleNetworkStateChange({ status: 'connecting' });
		});

		addEventListener('network:connected', (event) => {
			this.handleNetworkStateChange({
				status: 'connected',
				connected: event.detail.connected,
				total: event.detail.total,
			});
		});

		addEventListener('network:disconnected', () => {
			this.handleNetworkStateChange({ status: 'disconnected' });
		});

		// UI event delegation - bind to component DOM when modal is created
		this.setupUIEventDelegation();
	}

	setupUIEventDelegation() {
		// Get the modal container from the UI component
		const modal = this.ui.getModal();
		if (!modal) return;

		// Event delegation for modal interactions (scoped to component DOM)
		modal.addEventListener('click', (event) => {
			if (event.target.matches('.modal-close')) {
				this.handleModalClose();
			} else if (event.target === modal) {
				// Click outside to close
				this.handleModalClose();
			} else if (event.target.matches('#refreshBtn')) {
				this.handleRefresh();
			} else if (event.target.matches('#networkDiscoveryBtn')) {
				this.handleNetworkDiscovery();
			} else if (
				event.target.matches('.collapsible-header') ||
				event.target.closest('.collapsible-header')
			) {
				// Toggle collapsible section
				const header = event.target.matches('.collapsible-header')
					? event.target
					: event.target.closest('.collapsible-header');
				header.parentElement.classList.toggle('collapsed');
			}
		});

		// Escape key to close (document-wide for modal)
		document.addEventListener('keydown', this.handleEscapeKey);
	}

	handleEscapeKey(event) {
		if (event.key === 'Escape' && this.ui.isModalOpen()) {
			this.handleModalClose();
		}
	}

	// Modal lifecycle methods
	handleModalOpen() {
		this.ui.open();
		// Set up UI event delegation after modal is created
		this.setupUIEventDelegation();
		// Update modal with current data
		this.updateModalData();
	}

	handleModalClose() {
		// Clean up escape key listener before closing
		document.removeEventListener('keydown', this.handleEscapeKey);
		this.ui.close();
	}

	// Network state change handling
	handleNetworkStateChange(networkState) {
		if (this.ui.isModalOpen()) {
			this.ui.updateConnectionStatus(networkState);
		}
	}

	// Data update methods - controller provides data to component
	updateModalData() {
		if (!this.ui.isModalOpen()) return;

		const detailedPeers = this.getDetailedPeerInfo();
		const networkInfo = this.getNetworkInfo();
		const defaultPeers = this.getDefaultPeers();
		const currentPeers = this.getCurrentPeers();

		this.ui.updatePeerTable(detailedPeers);
		this.ui.updateConnectionStats(networkInfo);
		this.ui.updatePeerLists(defaultPeers, currentPeers);
	}

	// Action button handlers
	handleRefresh() {
		if (this.ui.isModalOpen()) {
			this.updateModalData();
		}
	}

	handleNetworkDiscovery() {
		// Dispatch event for gunWrapper to handle network discovery
		dispatchEvent('networkDiscovery');
	}

	// Data access methods for controller internal use
	getDetailedPeerInfo() {
		return this.connection.getDetailedPeerInfo
			? this.connection.getDetailedPeerInfo()
			: {};
	}

	getNetworkInfo() {
		return this.connection.getNetworkInfo
			? this.connection.getNetworkInfo()
			: {};
	}

	getDefaultPeers() {
		return this.connection.getDefaultPeers
			? this.connection.getDefaultPeers()
			: [];
	}

	getCurrentPeers() {
		return this.connection.peers || [];
	}

	// Public methods for external access
	showModal() {
		this.handleModalOpen();
	}

	hideModal() {
		this.handleModalClose();
	}

	isModalOpen() {
		return this.ui.isModalOpen();
	}
}
