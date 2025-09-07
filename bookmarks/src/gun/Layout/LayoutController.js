import { Layout } from './Layout.js';
import { addEventListener, dispatchEvent } from '../_lib/utils.js';

/**
 * LayoutController
 * Creates the layout and provides containers to other controllers
 */
export class LayoutController {
	constructor() {
		// Create Layout component
		this.ui = new Layout();

		// Render layout into body
		this.containers = this.ui.render(document.body);

		// Initialize sidebar components
		this.initializeSidebarComponents();
		this.setupToggleListener();
		this.setupRoomStateListeners();

		// Restore saved view preference
		this.ui.restoreView();

		// Start with loading state
		this.ui.showRoomState();
		this.ui.showLoadingSpinner();
	}

	initializeSidebarComponents() {
		// Sidebar components are now initialized in gun.js
		// This method is kept for potential future use
	}

	setupRoomStateListeners() {
		// Listen for room state changes
		addEventListener('room:joining', () => {
			this.ui.showRoomState();
			this.ui.showLoadingSpinner();
		});

		addEventListener('room:joined', () => {
			this.ui.hideRoomState();
		});

		addEventListener('room:left', () => {
			this.ui.showRoomState();
			this.ui.showRoomList();
		});

		addEventListener('network:connecting', () => {
			this.ui.showRoomState();
			this.ui.showLoadingSpinner();
		});

		addEventListener('network:disconnected', () => {
			this.ui.showRoomState();
			this.ui.showBlank();
		});

		// Listen for room selection events
		addEventListener('ui:joinRoom', (event) => {
			// Room joining is handled by other controllers
			// This just ensures the loading state is shown
			this.ui.showRoomState();
			this.ui.showLoadingSpinner();
		});

		// Listen for app initialization completion
		addEventListener('app:init', () => {
			// App is initializing, show loading spinner
			this.ui.showRoomState();
			this.ui.showLoadingSpinner();
		});

		// Listen for network connection established
		addEventListener('network:connected', () => {
			// Network is connected, show room list only if no hash (no auto-join)
			if (!window.location.hash) {
				this.ui.showRoomState();
				this.ui.showRoomList();
			}
		});

		// Set up room selection button listeners
		this.setupRoomSelectionListeners();
	}

	setupRoomSelectionListeners() {
		// This will be called when room list is shown
		// We'll set up event delegation on the room state container
		const roomStateContainer = document.getElementById(
			'room-state-container'
		);
		if (roomStateContainer) {
			roomStateContainer.addEventListener('click', (e) => {
				if (e.target.matches('.join-room-btn')) {
					const roomCard = e.target.closest('.room-card');
					const roomName = roomCard.dataset.room;
					dispatchEvent('ui:joinRoom', roomName);
				} else if (e.target.matches('.room-card')) {
					const roomName = e.target.dataset.room;
					dispatchEvent('ui:joinRoom', roomName);
				}
			});
		}
	}

	setupToggleListener() {
		const toggleBtn = document.getElementById('sidebar-toggle');
		if (toggleBtn) {
			toggleBtn.addEventListener('click', () => {
				this.ui.toggleView();
			});
		}
	}
}
