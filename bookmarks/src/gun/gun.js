import './gun.css';

// Import core services
import { ConnectionService } from './services/connection.js';
import { RoomService } from './services/room.js';
import { SyncService } from './services/sync.js';
import { PropsService } from './services/props.js';

// Import controllers
import { RoomController } from './Room/RoomController.js';
import { HeaderController } from './Header/HeaderController.js';
import { ActivityController } from './Activity/ActivityController.js';
import { ConnectionDetailsController } from './ConnectionDetails/ConnectionDetailsController.js';

async function startApp() {
	// Initialize controllers
	const roomController = new RoomController();
	const headerController = new HeaderController();
	const activityController = new ActivityController();
	const connectionDetailsController = new ConnectionDetailsController();

	// Show content once styles are loaded
	document.body.classList.add('styles-loaded');

	const connectionService = new ConnectionService();
	const roomService = new RoomService();
	const syncService = new SyncService();
	const propsService = new PropsService();

	// Initialize connection AFTER ready to listen to events
	connectionService.init();
	roomService.setConnection(connectionService.gun);
	syncService.setConnection(connectionService);
	connectionDetailsController.setConnection(connectionService);

	// Initialize authentication state
	connectionService.autoLogin();

	// Delay starting connection monitoring to allow "Connecting..." to show
	// TODO: this is probably due to cytoscape and should be handled elsewhere
	setTimeout(() => {
		connectionService.startMonitoring();
	}, 2000); // 2 second delay to show "Connecting..." state
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', startApp);
} else {
	startApp();
}
