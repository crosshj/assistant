import './gun.css';
import { dispatchEvent } from './_lib/utils.js';

// ConnectionService disabled - all functionality moved to AppController handlers

// Import controllers
import { LayoutController } from './Layout/LayoutController.js';
import { RoomController } from './Room/RoomController.js';
import { HeaderController } from './Header/HeaderController.js';
import { ActivityController } from './Activity/ActivityController.js';
import { ConnectionController } from './Connection/ConnectionController.js';
import { AppController } from './App/AppController.js';

async function startApp() {
	// Initialize controllers
	const layoutController = new LayoutController();
	const roomController = new RoomController();
	const headerController = new HeaderController();
	const activityController = new ActivityController();
	const connectionController = new ConnectionController();
	const appController = new AppController();

	// Show content once styles are loaded
	document.body.classList.add('styles-loaded');

	// ConnectionService disabled - all functionality now in AppController

	dispatchEvent('app:init');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', startApp);
} else {
	startApp();
}
