// import { GunDBWrapper } from './gunWrapper.js'; // COMMENTED OUT: Not using wrapper for now

/**
 * Event Coordinator
 * Listens to UI events and coordinates between services and StateManager
 */
export class EventCoordinator {
	constructor(connection, auth, rooms, stateManager, sync) {
		this.connection = connection;
		this.auth = auth;
		this.rooms = rooms;
		this.stateManager = stateManager;
		this.sync = sync;
		// this.gunWrapper = new GunDBWrapper(connection); // COMMENTED OUT: Not using wrapper for now

		// Listen to UI events from Header
		this.setupUIEventListeners();
	}

	setupUIEventListeners() {
		// Listen for custom UI events
		document.addEventListener('ui:connect', () => this.handleConnect());
		document.addEventListener('ui:disconnect', () =>
			this.handleDisconnect()
		);
		document.addEventListener('ui:testConnection', () =>
			this.handleTestConnection()
		);
		document.addEventListener('ui:joinRoom', (e) =>
			this.handleJoinRoom(e.detail)
		);
		document.addEventListener('ui:autoJoinRoom', (e) =>
			this.handleAutoJoinRoom(e)
		);
		document.addEventListener('ui:leaveRoom', () => this.handleLeaveRoom());
		document.addEventListener('ui:createIdentity', (e) =>
			this.handleCreateIdentity(e.detail)
		);
		document.addEventListener('ui:login', (e) =>
			this.handleLogin(e.detail)
		);

		// Listen for graph events
		window.addEventListener('graph:requestProps', (e) => {
			console.log(
				'📡 EventCoordinator: Received graph:requestProps event:',
				e.detail
			);
			this.handleRequestProps(e.detail);
		});
	}

	// ===== NETWORK EVENTS =====

	handleConnect() {
		console.log('🎯 EventCoordinator: Handling connect request');

		// Update state to connecting
		this.stateManager.setNetworkConnecting();

		// Call connection service
		const peers = this.connection.getDefaultPeers();
		this.connection.updatePeers(peers);
	}

	handleDisconnect() {
		console.log('🎯 EventCoordinator: Handling disconnect request');

		// Call connection service first
		this.connection.disconnect();

		// Then update state
		this.stateManager.setNetworkManuallyDisconnected();
	}

	handleTestConnection() {
		console.log('🎯 EventCoordinator: Handling test connection request');
		this.connection.testConnection();
	}

	// ===== ROOM EVENTS =====

	handleJoinRoom(roomName) {
		// Update state to joining
		this.stateManager.setRoomJoining(roomName);

		// Call room service
		if (this.rooms.joinRoom(roomName, this.connection)) {
			// Room joined successfully - state will be updated by room service
		} else {
			// Room join failed - revert state
			this.stateManager.setRoomLeft();
		}
	}

	handleAutoJoinRoom(event) {
		const roomName = event?.detail || 'public';
		this.handleJoinRoom(roomName);
	}

	handleLeaveRoom() {
		console.log('🎯 EventCoordinator: Handling leave room request');

		// Call room service first
		this.rooms.leaveRoom();

		// Unsubscribe from room data (this will clear the graph)
		if (this.sync) {
			this.sync.unsubscribeFromRoom();
		}

		// Then update state
		this.stateManager.setRoomLeft();
	}

	// ===== AUTH EVENTS =====

	handleCreateIdentity(alias) {
		console.log(
			'🎯 EventCoordinator: Handling create identity request:',
			alias
		);
		this.auth.createIdentity(alias);
	}

	handleLogin(credentials) {
		console.log(
			'🎯 EventCoordinator: Handling login request:',
			credentials
		);
		this.auth.login(credentials.alias, credentials.password);
	}

	// ===== SERVICE EVENT HANDLERS =====
	// These are called by services to update state

	onConnectionStatusChanged(data) {
		const connected = typeof data === 'object' ? data.connected : data;
		const total = typeof data === 'object' ? data.total : arguments[1];

		this.stateManager.setNetworkConnected(connected, total);
	}

	onRoomStatusChanged(status, roomName) {
		if (status && status.includes('📊') && roomName) {
			this.stateManager.setRoomJoined(roomName);

			// COMMENTED OUT: Delay that was causing timing issues
			// setTimeout(() => {
			// 	if (this.rooms.isInRoom() && this.sync) {
			// 		this.sync.subscribeToRoom();
			// 	} else {
			// 		console.log(
			// 			'⚠️ Cannot start data sync: room not ready or sync service unavailable'
			// 		);
			// 	}
			// }, 100);

			// Start data sync immediately instead
			if (this.rooms.isInRoom() && this.sync) {
				this.sync.subscribeToRoom();
			} else {
				console.log(
					'⚠️ Cannot start data sync: room not ready or sync service unavailable'
				);
			}
		} else if (status === 'not joined') {
			this.stateManager.setRoomLeft();
		} else {
			console.log('⚠️ Unknown room status:', status);
		}
	}

	onUserAuthenticated(alias) {
		console.log('🎯 EventCoordinator: User authenticated:', alias);
		this.stateManager.setAuthAuthenticated(alias);
	}

	// ===== GRAPH EVENTS =====

	async handleRequestProps(detail) {
		console.log(
			'🔍 EventCoordinator: Props request for',
			detail.elementType,
			detail.elementId
		);
		const { elementId, elementType, room } = detail;
		if (!elementId || !room || !elementType) {
			console.log('❌ EventCoordinator: Missing required data');
			return;
		}

		try {
			// COMMENTED OUT: GunDB calls that were interfering with graph
			// const gun = this.connection.gun;
			// const elementRef = gun
			// 	.get('graphs')
			// 	.get(room)
			// 	.get(elementType === 'node' ? 'nodes' : 'edges')
			// 	.get(elementId);
			//
			// elementRef.once((elementData) => { ... });

			// TEMPORARY: Just return empty props to prevent graph interference
			console.log(
				'⚠️ EventCoordinator: Props loading temporarily disabled to prevent graph interference'
			);

			const event = new CustomEvent('graph:propsLoaded', {
				detail: {
					elementId,
					elementType,
					props: {},
				},
			});
			window.dispatchEvent(event);
		} catch (error) {
			console.log(
				'❌ EventCoordinator: Error reading props:',
				error.message
			);

			const event = new CustomEvent('graph:propsLoaded', {
				detail: {
					elementId,
					elementType,
					props: {},
				},
			});
			window.dispatchEvent(event);
		}
	}
}
