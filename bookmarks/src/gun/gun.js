import './gun.css';
import { dispatchEvent } from './_lib/utils.js';

// Import core services
import { ConnectionService } from './services/connection.js';
import { SyncService } from './services/sync.js';

// Import controllers
import { LayoutController } from './Layout/LayoutController.js';
import { RoomController } from './Room/RoomController.js';
import { HeaderController } from './Header/HeaderController.js';
import { ActivityController } from './Activity/ActivityController.js';
import { ConnectionController } from './Connection/ConnectionController.js';
import { AppController } from './App/AppController.js';

async function startApp() {
	// Initialize AppController

	// Initialize controllers
	const layoutController = new LayoutController();
	const roomController = new RoomController();
	const headerController = new HeaderController();
	const activityController = new ActivityController();
	const connectionController = new ConnectionController();
	const appController = new AppController();

	const connectionService = new ConnectionService();
	const syncService = new SyncService();

	// Show content once styles are loaded
	document.body.classList.add('styles-loaded');

	// Initialize connection AFTER ready to listen to events
	connectionService.init();
	syncService.setConnection(connectionService);

	// TEMPORARY: used to inject GunDB instance into AppController
	appController.stupidDumbRemoveMe(connectionService);

	dispatchEvent('app:init');

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
