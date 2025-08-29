import './gun.css';

// Import core services
import { StateManager } from './services/stateManager.js';
import { EventCoordinator } from './services/eventCoordinator.js';
import { GunConnection } from './services/connection.js';
import { AuthManager } from './services/auth.js';
import { RoomManager } from './services/room.js';
import { GraphOperations } from './services/graphOperations.js';
import { DataSync } from './services/sync.js';

// Import new UI components
import { Activity } from './Activity/Activity.js';
import { ConnectionDetails } from './ConnectionDetails/ConnectionDetails.js';
import { PropsManager } from './services/PropsManager.js';

// Import controllers
import { RoomController } from './Room/RoomController.js';
import { HeaderController } from './Header/HeaderController.js';
import { ActivityController } from './Activity/ActivityController.js';

// Main GunDB Application
class GunApp {
	constructor() {
		// State management (single source of truth)
		this.stateManager = null; // Will be initialized in start() with sidebar access

		// Core services
		this.connection = new GunConnection();
		this.auth = null;
		this.rooms = null;
		this.graph = null;
		this.sync = null;

		// Event coordination
		this.eventCoordinator = null;

		// UI components
		this.room = null;
		this.connectionDetails = null;
		this.propsManager = null;

		// Controllers
		this.roomController = null;
	}

	async start() {
		// Show content once styles are loaded
		document.body.classList.add('styles-loaded');

		// Initialize state manager (no longer needs activity reference)
		this.stateManager = new StateManager();

		// Broadcast state changes as DOM events for components that need them
		this.stateManager.on('stateChanged', (state) => {
			document.dispatchEvent(
				new CustomEvent('stateChanged', { detail: state })
			);
		});

		// Initialize core services that depend on state manager (but not connection yet)
		this.auth = new AuthManager(null, this.stateManager); // Will set connection.user later
		this.rooms = new RoomManager(null, this.stateManager); // Will set connection.gun later
		this.graph = new GraphOperations(this.rooms, this.auth);
		this.sync = new DataSync(
			this.rooms,
			null, // Will set connection later
			this.stateManager
		);

		// Initialize remaining UI components
		this.propsManager = new PropsManager();

		// Initialize controllers (they create their own components)
		this.roomController = new RoomController(
			this.rooms,
			this.sync,
			null, // Will set connection later
			this.stateManager,
			this.graph
		);

		// Initialize HeaderController (creates its own Header component)
		this.headerController = new HeaderController(
			null, // Will set connection later
			this.auth,
			this.stateManager
		);

		// Initialize ActivityController (creates and owns Activity component)
		this.activityController = new ActivityController();

		// Initialize connection AFTER controllers are ready to listen to events
		this.connection.init(this.connection.getDefaultPeers());

		// Now update all services and controllers with the connection reference
		this.auth.setConnection(this.connection.user);
		this.rooms.setConnection(this.connection.gun);
		this.sync.setConnection(this.connection);
		this.roomController.setConnection(this.connection);
		this.headerController.setConnection(this.connection);

		// Initialize connection details after connection is ready
		this.connectionDetails = new ConnectionDetails(this.connection);

		// Get component references from controllers
		this.room = this.roomController.ui; // TODO: this is BAD, we don't want room UI being accessed directly!!!

		// ARCHITECTURAL ISSUE TO FIX:
		// gun.js should NEVER directly access UI components. This violates separation of concerns.
		// Instead, gun.js should:
		// 1. Only interact with controllers
		// 2. Controllers handle UI updates
		// 3. UI components are completely encapsulated
		//
		// TODO: Remove these direct UI references and ensure all UI updates go through controllers

		// Initialize event coordination
		this.eventCoordinator = new EventCoordinator(
			this.connection,
			this.auth,
			this.rooms,
			this.stateManager,
			this.sync
		);

		// Wire up event system between services and UI
		this.wireUpEvents();

		// Note: Network state rendering is handled by Header component + NetworkUI controller
		// The stateManager already starts with 'connecting' status

		// Initialize authentication state
		this.auth.autoLogin();

		// Setup global functions for components to use
		this.setupGlobalFunctions();

		// Delay starting connection monitoring to allow "Connecting..." to show
		setTimeout(() => {
			this.connection.startMonitoring();
		}, 2000); // 2 second delay to show "Connecting..." state
	}

	wireUpEvents() {
		// Event mappings: service -> event -> EventCoordinator
		const events = {
			rooms: {
				roomStatusChanged: (status, roomName) => {
					this.eventCoordinator.onRoomStatusChanged(status, roomName);
				},
			},
			connection: {
				connectionStatusChanged: (data) => {
					this.eventCoordinator.onConnectionStatusChanged(data);
					// Note: Header visibility is handled by state management system
				},
			},
			sync: {
				clearGraph: () => {
					// Dispatch event for RoomController to handle
					document.dispatchEvent(new CustomEvent('sync:clearGraph'));
				},
				addNode: (nodeData) => {
					// Dispatch event for RoomController to handle
					document.dispatchEvent(
						new CustomEvent('sync:addNode', { detail: nodeData })
					);
				},
				removeNode: (nodeData) => {
					// Dispatch event for RoomController to handle
					document.dispatchEvent(
						new CustomEvent('sync:removeNode', { detail: nodeData })
					);
				},
				addEdge: (edgeData) => {
					// Dispatch event for RoomController to handle
					document.dispatchEvent(
						new CustomEvent('sync:addEdge', { detail: edgeData })
					);
				},
				removeEdge: (edgeData) => {
					// Dispatch event for RoomController to handle
					document.dispatchEvent(
						new CustomEvent('sync:removeEdge', { detail: edgeData })
					);
				},
			},
		};

		// Sync events are now handled directly by RoomController
		// No need to wire them up here

		// Wire up connection service events to EventCoordinator
		this.connection.on('connectionStatusChanged', (data) => {
			this.eventCoordinator.onConnectionStatusChanged(data);
		});

		this.connection.on('userLoggedIn', (data) => {
			this.eventCoordinator.onUserAuthenticated(data.alias);
		});
	}

	setupGlobalFunctions() {
		// Global function mappings
		const globals = {
			joinRoom: (room) => {
				// Dispatch event for RoomController to handle
				document.dispatchEvent(
					new CustomEvent('ui:joinRoom', { detail: room })
				);
			},
			leaveRoom: () => {
				// Dispatch event for RoomController to handle
				document.dispatchEvent(new CustomEvent('ui:leaveRoom'));
			},
			refreshRoom: () => this.sync.refreshData(),
			exportRoom: async () => {
				// Dispatch event for RoomController to handle
				document.dispatchEvent(
					new CustomEvent('graph:export', {
						detail: { room: this.rooms.getCurrentRoom() },
					})
				);
			},
			importRoomData: (data) => this.rooms.importRoomData(data),
			updateNodeForm: (data) => {
				// Dispatch event for RoomController to handle
				document.dispatchEvent(
					new CustomEvent('ui:updateNodeForm', { detail: { data } })
				);
			},
			updateEdgeForm: (data) => {
				// Dispatch event for RoomController to handle
				document.dispatchEvent(
					new CustomEvent('ui:updateEdgeForm', { detail: { data } })
				);
			},
			clearActivityLog: () => {
				// Directly clear the log element
				const logElement = document.getElementById('log');
				if (logElement) {
					logElement.innerHTML = '';
				}
			},
			copyActivityLog: () => {
				// Copy the activity log contents to clipboard in a clean, terse format
				const logElement = document.getElementById('log');
				if (logElement) {
					const logItems = logElement.querySelectorAll('li');
					if (logItems.length > 0) {
						// Format each log item in a clean, terse way
						const formattedLog = Array.from(logItems)
							.map((item) => {
								const text = item.textContent || '';
								// Extract timestamp if present (format: HH:MM:SS.mmm)
								const timeMatch = text.match(
									/(\d{2}:\d{2}:\d{2}\.\d{3})/
								);
								const timestamp = timeMatch ? timeMatch[1] : '';

								// Remove timestamp and clean up the message
								let message = text
									.replace(/\d{2}:\d{2}:\d{2}\.\d{3}/, '')
									.trim();

								// Clean up common patterns for terseness
								message = message
									.replace(/✅ /g, '✓ ')
									.replace(/❌ /g, '✗ ')
									.replace(/⚠️ /g, '! ')
									.replace(/🔄 /g, '→ ')
									.replace(/🌐 /g, '🌐 ')
									.replace(/🗑️ /g, '🗑 ')
									.replace(/🔍 /g, '🔍 ')
									.replace(/🎯 /g, '🎯 ');

								// Format: [TIME] MESSAGE
								return timestamp
									? `[${timestamp}] ${message}`
									: message;
							})
							.join('\n');

						// Add a summary header
						const summary = `ACTIVITY LOG (${logItems.length} entries):\n${formattedLog}`;

						navigator.clipboard
							.writeText(summary)
							.then(() => {
								// Success - no logging needed
							})
							.catch((err) => {
								console.error(
									'Failed to copy to clipboard:',
									err
								);
								// Fallback for older browsers
								const textArea =
									document.createElement('textarea');
								textArea.value = summary;
								document.body.appendChild(textArea);
								textArea.select();
								document.execCommand('copy');
								document.body.removeChild(textArea);
							});
					} else {
						// No content to copy - no logging needed
					}
				}
			},
		};

		// Set up all global functions
		Object.entries(globals).forEach(([name, fn]) => {
			window[name] = fn;
		});

		// Global state
		Object.defineProperty(window, 'currentRoom', {
			get: () => this.rooms.getCurrentRoom(),
			set: () => {}, // Read-only
		});

		// Make PropsManager globally accessible
		Object.defineProperty(window, 'propsManager', {
			get: () => this.propsManager,
			set: () => {}, // Read-only
		});

		// Make visualization globally accessible for debugging
		Object.defineProperty(window, 'visualization', {
			get: () => this.visualization,
			set: () => {}, // Read-only
		});

		// Make visualization instance globally accessible for props fetching
		Object.defineProperty(window, 'cy', {
			get: () =>
				this.room && this.room.visualization
					? this.room.visualization.cy
					: null,
			set: () => {}, // Read-only
		});
	}
}

// Start the application when DOM is ready
const app = new GunApp();

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => app.start());
} else {
	app.start();
}
