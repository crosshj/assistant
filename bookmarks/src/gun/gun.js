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
		this.connection = null;
		this.auth = null;
		this.rooms = null;
		this.graph = null;
		this.sync = null;

		// Event coordination
		this.eventCoordinator = null;

		// UI components
		this.connectionDetails = null;
		this.propsManager = null;

		// Controllers
		this.roomController = null;
		this.headerController = null;
		this.activityController = null;
	}

	async start() {
		this.connection = new GunConnection();

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

		// Initialize authentication state
		this.auth.autoLogin();

		// Delay starting connection monitoring to allow "Connecting..." to show
		setTimeout(() => {
			this.connection.startMonitoring();
		}, 2000); // 2 second delay to show "Connecting..." state
	}

	wireUpEvents() {
		// Wire up connection service events to EventCoordinator
		this.connection.on('connectionStatusChanged', (data) => {
			this.eventCoordinator.onConnectionStatusChanged(data);
		});

		this.connection.on('userLoggedIn', (data) => {
			this.eventCoordinator.onUserAuthenticated(data.alias);
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
