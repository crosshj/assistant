import { addEventListener } from '../_lib/utils.js';
import { getHandlers as getConnectionHandlers } from './handlersConnection.js';
import { getHandlers as getRoomHandlers } from './handlersRoom.js';
import { getHandlers as getGraphHandlers } from './handlersGraph.js';
import { GunDBWrapper } from '../_lib/gunWrapper.js';

/**
 * AppController
 * Main application orchestrator that coordinates all controllers and services
 * Replaces the startApp() function in gun.js
 */
export class AppController {
	constructor() {
		// Initialize Gun wrapper
		this.gun = new GunDBWrapper();

		// Set up application-level event listeners
		this.setupEventListeners();
	}

	init() {
		// Initialize GunDB connection
		this.gun.init();

		// Trigger auto-login
		this.gun.autoLogin();

		// Start connection monitoring
		// TODO: Move from gun.js setTimeout logic
		setTimeout(() => {
			this.gun.startMonitoring();
		}, 2000); // 2 second delay to show "Connecting..." state
	}

	setupEventListeners() {
		// Connection events
		const connection = getConnectionHandlers(this);
		addEventListener('networkDiscovery', connection.discovery);
		addEventListener('ui:connect', connection.connect);
		addEventListener('ui:disconnect', connection.disconnect);
		addEventListener('ui:testConnection', connection.test);
		addEventListener('ui:createIdentity', connection.identityCreate);
		addEventListener('ui:login', connection.login);
		addEventListener('network:infoRequest', connection.info);

		// Room events
		const room = getRoomHandlers(this);
		addEventListener('ui:joinRoom', room.join);
		addEventListener('ui:leaveRoom', room.leave);
		addEventListener('room:exportRequested', room.export);
		addEventListener('room:importRequested', room.import);

		// Graph events
		const graph = getGraphHandlers(this);
		addEventListener('selectionChanged', graph.select);
		addEventListener('graph:requestProps', graph.select); // Current app state - details via requestProps
		addEventListener('room:upsertNode', graph.nodeUpsert);
		addEventListener('room:deleteNode', graph.nodeDelete);
		addEventListener('room:upsertEdge', graph.edgeUpsert);
		addEventListener('room:deleteEdge', graph.edgeDelete);
	}
}
