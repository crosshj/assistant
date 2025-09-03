import {
	addEventListener,
	log,
	tryJSONParse,
	dispatchEvent,
} from '../_lib/utils.js';
import { getHandlers as getConnectionHandlers } from './handlersConnection.js';
import { getHandlers as getRoomHandlers } from './handlersRoom.js';
import { getHandlers as getGraphWriteHandlers } from './handlersGraphWrite.js';
import { getHandlers as getGraphReadHandlers } from './handlersGraphRead.js';
import { GunDBWrapper } from '../_lib/gunWrapper.js';
import Gun from 'gun';
import 'gun/sea';
import 'gun/axe';

const defaultPeers = [
	'https://gun-us.herokuapp.com/gun',
	'https://gun-eu.herokuapp.com/gun',
	'https://gunjs.herokuapp.com/gun',
];

/**
 * AppController
 * Main application orchestrator that coordinates all controllers and services
 * Replaces the startApp() function in gun.js
 */
export class AppController {
	constructor() {
		// Default peers available everywhere
		this.defaultPeers = defaultPeers;

		// Initialize Gun instances - AppController now owns both
		this.rawGun = Gun({
			peers: this.defaultPeers,
			localStorage: true,
			multicast: true,
			webrtc: true,
			retry: 3,
			timeout: 5000,
		});

		this.gun = new GunDBWrapper({ gun: this.rawGun });

		// Initialize user for authentication
		this.user = this.rawGun.user();

		// Shared room state for handlers
		this.currentRoom = null;
		this.graphRoot = null;

		// Sync state
		this.nodesChain = null;
		this.edgesChain = null;
		this.isSubscribed = false;
		this._isPaused = false;
		this._propsLoadingFlag = false;

		// Set up application-level event listeners
		this.setupEventListeners();
	}

	/**
	 * Get Gun instances for external services to use
	 * This allows services to access the instances owned by AppController
	 * TEMPORARY: This is a hack to allow connection service to access the instances, remove this when connection service is refactored
	 */
	getGunInstances() {
		return {
			rawGun: this.rawGun,
			gunDBWrapper: this.gun,
		};
	}

	setupEventListeners() {
		// Get all handlers at the top
		const connection = getConnectionHandlers(this);
		const room = getRoomHandlers(this);
		const graphWrite = getGraphWriteHandlers(this);
		const graphRead = getGraphReadHandlers(this);

		const roomJoin = (event) => {
			room.join(event, graphRead.subscribe);
		};
		const roomLeave = (event) => {
			room.leave(event, graphRead.unsubscribe);
		};

		// App initialization event
		addEventListener('app:init', () => {
			connection.autoLogin();
			setTimeout(() => {
				connection.startMonitoring();
			}, 2000); // 2 second delay to show "Connecting..." state
		});

		// Connection events
		addEventListener('networkDiscovery', connection.discovery);
		addEventListener('ui:connect', connection.connect);
		addEventListener('ui:disconnect', connection.disconnect);
		addEventListener('ui:testConnection', connection.test);
		addEventListener('ui:createIdentity', connection.identityCreate);
		addEventListener('ui:login', connection.login);
		addEventListener('network:infoRequest', connection.info);

		// Room events
		addEventListener('ui:joinRoom', roomJoin);
		addEventListener('ui:leaveRoom', roomLeave);
		addEventListener('room:exportRequested', room.export);
		addEventListener('room:importRequested', room.import);

		// Graph write events
		addEventListener('graph:nodeUpsert', graphWrite.nodeUpsert);
		addEventListener('graph:nodeDelete', graphWrite.nodeDelete);
		addEventListener('graph:edgeUpsert', graphWrite.edgeUpsert);
		addEventListener('graph:edgeDelete', graphWrite.edgeDelete);

		// Graph read events
		addEventListener('graph:select', graphRead.select);
	}
}
