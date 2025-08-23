import './gun.css';

// Import core services
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

// Main GunDB Application
class GunApp {
	constructor() {
		// Core services
		this.connection = new GunConnection();
		this.auth = null;
		this.rooms = null;
		this.graph = null;
		this.visualization = new GraphVisualization();
		this.sync = null;

		// UI components
		this.header = null;
		this.forms = null;
		this.graphView = null;
		this.sidebar = new Sidebar();
	}

	async start() {
		// Show content once styles are loaded
		document.body.classList.add('styles-loaded');

		// Initialize core services
		this.connection.init([]);
		this.auth = new AuthManager(this.connection.user);
		this.rooms = new RoomManager(this.connection.gun);
		this.graph = new GraphOperations(this.rooms, this.auth);
		this.sync = new DataSync(this.rooms);

		// Initialize UI components
		this.header = new Header(this.connection, this.auth);
		this.forms = new GraphForms(this.graph, this.connection);
		this.graphView = new GraphView(this.visualization);

		// Wire up event system between services and UI
		this.wireUpEvents();

		// Setup global functions for components to use
		this.setupGlobalFunctions();

		// Wait for DOM and initialize UI
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => this.initUI());
		} else {
			this.initUI();
		}
	}

	wireUpEvents() {
		// Event mappings: service -> event -> component.method
		const events = {
			connection: {
				connectionStatusChanged:
					this.header.updateConnectionStatus.bind(this.header),
				userLoggedIn: this.header.updateUserDisplay.bind(this.header),
				connectionRestored: () => (window.connectionErrorShown = false),
			},
			rooms: {
				roomStatusChanged: this.header.updateRoomStatus.bind(
					this.header
				),
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
	}

	setupGlobalFunctions() {
		// Global function mappings
		const globals = {
			joinRoom: (room) => {
				if (this.rooms.joinRoom(room, this.connection)) {
					setTimeout(() => this.sync.subscribeToRoom(), 100);
				}
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

		console.log('GunDB Collaborative Graph ready');
	}
}

// Start the application
const app = new GunApp();
app.start();
