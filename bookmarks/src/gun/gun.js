import './gun.css';

// Import core services
import { StateManager } from './services/stateManager.js';
import { EventCoordinator } from './services/eventCoordinator.js';
import { GunConnection } from './services/connection.js';
import { AuthManager } from './services/auth.js';
import { RoomManager } from './services/room.js';
import { GraphOperations } from './services/graphOperations.js';
import { GraphVisualization } from './components/visualization/visualization.js';
import { DataSync } from './services/sync.js';

// Import UI components
import { Header } from './components/header/Header.js';
import { GraphForms } from './components/forms/GraphForms.js';
import { GraphView } from './components/graph/GraphView.js';
import { Sidebar } from './components/sidebar/Sidebar.js';
import { PropsManager } from './components/PropsManager.js';

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
		this.visualization = new GraphVisualization();
		this.sync = null;

		// Event coordination
		this.eventCoordinator = null;

		// UI components
		this.header = null;
		this.forms = null;
		this.graphView = null;
		this.sidebar = new Sidebar();
		this.propsManager = new PropsManager();
	}

	async start() {
		// Show content once styles are loaded
		document.body.classList.add('styles-loaded');

		// Initialize state manager first (single source of truth)
		this.stateManager = new StateManager(this.sidebar);

		// Initialize connection first with default peers (but don't start monitoring yet)
		this.connection.init(this.connection.getDefaultPeers());

		// Initialize core services that depend on connection and state manager
		this.auth = new AuthManager(this.connection.user, this.stateManager);
		this.rooms = new RoomManager(this.connection.gun, this.stateManager);
		this.graph = new GraphOperations(this.rooms, this.auth);
		this.sync = new DataSync(
			this.rooms,
			this.connection,
			this.stateManager
		);

		// Initialize event coordination
		this.eventCoordinator = new EventCoordinator(
			this.connection,
			this.auth,
			this.rooms,
			this.stateManager,
			this.sync
		);

		// Initialize UI components
		this.header = new Header(this.connection, this.auth, this.stateManager);
		this.forms = new GraphForms(this.graph, this.connection);
		this.graphView = new GraphView(this.visualization);

		// Wire up event system between services and UI
		this.wireUpEvents();

		// Note: Network state rendering is handled by Header component + NetworkUI controller
		// The stateManager already starts with 'connecting' status

		// Initialize authentication state
		this.auth.autoLogin();

		// Setup global functions for components to use
		this.setupGlobalFunctions();

		// Wait for DOM and initialize UI - do this BEFORE the delay
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => this.initUI());
		} else {
			this.initUI();
		}

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
				clearGraph: this.visualization.clearGraph.bind(
					this.visualization
				),
				addNode: ({ data }) => this.visualization.addNode(data),
				removeNode: ({ id }) => this.visualization.removeNode(id),
				addEdge: ({ data }) => this.visualization.addEdge(data),
				removeEdge: ({ id }) => this.visualization.removeEdge(id),
			},
		};

		// Wire up all events
		Object.entries(events).forEach(([service, eventMap]) => {
			Object.entries(eventMap).forEach(([event, handler]) => {
				this[service].on(event, handler);
			});
		});

		// Wire up connection service events to EventCoordinator (duplicate removed)
		// The connectionStatusChanged event is already handled in the events object above

		this.connection.on('userLoggedIn', (data) => {
			this.eventCoordinator.onUserAuthenticated(data.alias);
		});
	}

	setupGlobalFunctions() {
		// Global function mappings
		const globals = {
			joinRoom: (room) => {
				if (this.rooms.joinRoom(room, this.connection)) {
					// Data sync is now handled by EventCoordinator after room join completes
				}
			},
			leaveRoom: () => {
				// Use EventCoordinator to ensure proper state management
				this.eventCoordinator.handleLeaveRoom();
			},
			refreshRoom: () => this.sync.refreshData(),
			exportRoom: async () => {
				const data = await this.rooms.exportRoom(
					this.rooms.getCurrentRoom()
				);
				const blob = new Blob([JSON.stringify(data, null, 2)], {
					type: 'application/json',
				});
				const a = document.createElement('a');
				a.href = URL.createObjectURL(blob);
				a.download = `${this.rooms.getCurrentRoom()}-graph.json`;
				a.click();
				this.sidebar.success('exported');
			},
			importRoomData: (data) => this.rooms.importRoomData(data),
			updateNodeForm: (data) => this.forms.updateNodeForm(data),
			updateEdgeForm: (data) => this.forms.updateEdgeForm(data),
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
	}

	initUI() {
		// Initialize visualization
		this.visualization.init('cy');

		// Setup component event handlers
		this.header.setupEventHandlers();
		this.forms.setupEventHandlers();
		this.graphView.setupEventHandlers();
		this.graphView.setupKeyboardShortcuts();

		// Set initial values
		this.header.setInitialValues();

		// Setup clear log button
		this.setupClearLogButton();

		// Setup copy log button
		this.setupCopyLogButton();

		// Note: Initial header state is set in start() method, not here
	}

	setupClearLogButton() {
		const clearLogBtn = document.getElementById('clearLog');
		if (clearLogBtn) {
			clearLogBtn.onclick = () => {
				window.clearActivityLog();
			};
		}
	}

	setupCopyLogButton() {
		const copyLogBtn = document.getElementById('copyLog');
		if (copyLogBtn) {
			copyLogBtn.onclick = () => {
				window.copyActivityLog();
			};
		}
	}

	// Note: Header visibility is now handled by Header component + NetworkUI controller
	// This method is no longer needed

	// Note: Monitoring is no longer needed since NetworkUI handles all rendering
}

// Start the application
const app = new GunApp();
app.start();
