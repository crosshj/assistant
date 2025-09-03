import { log, addEventListener, dispatchEvent } from '../_lib/utils.js';
import { Connection } from './Connection.js';

/**
 * ConnectionController
 * Handles all connection modal events and business logic
 * Coordinates between UI component and connection service
 */
export class ConnectionController {
	constructor() {
		this.connection = null;

		// Create Connection component (pure UI renderer)
		this.ui = new Connection();

		// Bind controller methods
		this.handleRefresh = this.handleRefresh.bind(this);
		this.handleNetworkDiscovery = this.handleNetworkDiscovery.bind(this);
		this.handleModalOpen = this.handleModalOpen.bind(this);
		this.handleModalClose = this.handleModalClose.bind(this);
		this.handleEscapeKey = this.handleEscapeKey.bind(this);

		// Setup event listeners
		this.setupEventListeners();
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

		// Listen for network info response
		addEventListener('network:infoResponse', (event) => {
			this.handleNetworkInfoResponse(event.detail);
		});

		// Note: UI event delegation will be set up when modal is opened
	}

	setupUIEventDelegation() {
		// Get the modal container from the UI component
		const modal = this.ui.getModal();
		if (!modal) return;

		// Prevent duplicate event listeners
		if (this.uiEventListenersSetup) return;
		this.uiEventListenersSetup = true;

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
		// Reset event listeners flag for next open
		this.uiEventListenersSetup = false;
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

		// Request network info via event system
		this.requestNetworkInfo();
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

	// Request network info via event system
	requestNetworkInfo() {
		dispatchEvent('network:infoRequest');
	}

	// Handle network info response from AppController
	handleNetworkInfoResponse(networkData) {
		if (!this.ui.isModalOpen()) return;

		const { detailedPeerInfo, networkInfo, defaultPeers, currentPeers } =
			networkData;

		this.ui.updatePeerTable(detailedPeerInfo);
		this.ui.updateConnectionStats(networkInfo);
		this.ui.updatePeerLists(defaultPeers, currentPeers);
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
