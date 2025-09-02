import './gun.css';

// Import core services
import { EventCoordinator } from './services/eventCoordinator.js';
import { GunConnection } from './services/connection.js';

import { RoomManager } from './services/room.js';
import { Sync } from './services/sync.js';

// Import new UI components
import { PropsManager } from './services/PropsManager.js';

// Import controllers
import { RoomController } from './Room/RoomController.js';
import { HeaderController } from './Header/HeaderController.js';
import { ActivityController } from './Activity/ActivityController.js';
import { ConnectionDetailsController } from './ConnectionDetails/ConnectionDetailsController.js';

// Main GunDB Application
async function startApp() {
	const connection = new GunConnection();

	// Show content once styles are loaded
	document.body.classList.add('styles-loaded');

	// Initialize services
	const rooms = new RoomManager();
	const sync = new Sync();
	const propsManager = new PropsManager();

	// Initialize controllers
	const roomController = new RoomController();
	const headerController = new HeaderController();
	const activityController = new ActivityController();

	// Initialize connection AFTER controllers are ready to listen to events
	connection.init(connection.getDefaultPeers());

	// Now update all services and controllers with the connection reference
	rooms.setConnection(connection.gun);
	sync.setConnection(connection);
	roomController.setConnection(connection);
	headerController.setConnection(connection);

	// Initialize connection details controller after connection is ready
	const connectionDetailsController = new ConnectionDetailsController(
		connection
	);

	// Initialize event coordination
	const eventCoordinator = new EventCoordinator(connection, rooms, sync);

	// Initialize authentication state
	connection.autoLogin();

	// Delay starting connection monitoring to allow "Connecting..." to show
	setTimeout(() => {
		connection.startMonitoring();
	}, 2000); // 2 second delay to show "Connecting..." state
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', startApp);
} else {
	startApp();
}
