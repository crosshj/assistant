import { GunDBWrapper } from '../lib/gunWrapper.js';
import { log, addEventListener, dispatchEvent } from '../lib/utils.js';
import { Room } from './Room.js';

/**
 * RoomController
 * Handles all room-related events and business logic
 * Coordinates between UI components and services
 */
export class RoomController {
	constructor(stateManager, graphOperations) {
		this.connection = null; // Will be set via setConnection()
		this.stateManager = stateManager;
		this.graphOperations = graphOperations;

		// TODO: Remove direct gunWrapper usage - should go through App Controller instead
		// This creates coupling that should be resolved when we have proper event-driven architecture
		this.gunWrapper = null; // Will be initialized in setConnection()

		// Current room state
		this.currentRoom = null;

		// Create Room component with controller reference
		this.ui = new Room({ controller: this });

		// Bind room lifecycle methods
		this.onRoomJoining = this.onRoomJoining.bind(this);
		this.onRoomJoined = this.onRoomJoined.bind(this);
		this.onRoomLeaving = this.onRoomLeaving.bind(this);
		this.onRoomLeft = this.onRoomLeft.bind(this);

		// Bind bridge method for Room component
		this.onJoinRoom = this.onJoinRoom.bind(this);

		// Bind room component methods for event listeners
		this.handleRoomLeft = this.ui.handleRoomLeft.bind(this.ui);
		this.handleClearGraph = this.ui.handleClearGraph.bind(this.ui);
		this.syncAddNode = this.ui.syncAddNode.bind(this.ui);
		this.syncRemoveNode = this.ui.syncRemoveNode.bind(this.ui);
		this.syncAddEdge = this.ui.syncAddEdge.bind(this.ui);
		this.syncRemoveEdge = this.ui.syncRemoveEdge.bind(this.ui);

		// Graph operations are still handled via roomService events for now
		this.handleGraphExport = this.handleGraphExport.bind(this);
		this.handleGraphImport = this.handleGraphImport.bind(this);
		this.handleGraphClearLocal = this.handleGraphClearLocal.bind(this);
		this.handleGraphSearch = this.handleGraphSearch.bind(this);
		this.handleGraphClearSearch = this.handleGraphClearSearch.bind(this);
		this.handleGraphLayoutChange = this.handleGraphLayoutChange.bind(this);
		this.handleGraphFit = this.handleGraphFit.bind(this);
		this.handleRequestProps = this.handleRequestProps.bind(this);

		// Setup event listeners
		this.setupEventListeners();

		// Setup resize handler
		this.setupResizeHandler();
	}

	setConnection(connection) {
		this.connection = connection;
		this.gunWrapper = new GunDBWrapper(connection, this.currentRoom);
	}

	setupEventListeners() {
		// Room pane events from Header
		addEventListener('ui:showConnectingSpinner', () => {
			// Show connecting spinner when user actively clicks Connect
			this.ui.showConnectingSpinner();
		});

		// Sync events - now using DOM events from sync service
		addEventListener('sync:clearGraph', this.handleClearGraph);
		addEventListener('sync:addNode', (event) =>
			this.syncAddNode(event.detail)
		);
		addEventListener('sync:removeNode', (event) =>
			this.syncRemoveNode(event.detail)
		);
		addEventListener('sync:addEdge', (event) =>
			this.syncAddEdge(event.detail)
		);
		addEventListener('sync:removeEdge', (event) =>
			this.syncRemoveEdge(event.detail)
		);

		// Graph events - these are now handled by direct method calls from Room component

		// Room service response events
		addEventListener(
			'room:exportCompleted',
			this.handleRoomExportCompleted
		);
		addEventListener(
			'room:importCompleted',
			this.handleRoomImportCompleted
		);

		// State change events - handle room pane visibility based on network status
		addEventListener('stateChanged', (event) => {
			const state = event.detail;
			if (state.network && state.network.status) {
				if (
					state.network.status === 'connected' ||
					state.network.status === 'partial'
				) {
					// Don't immediately switch to room selection - let auto-join handle it
					// Only show room selection if we're explicitly not in a room
					if (
						!this.currentRoom &&
						!this.stateManager.isAutoJoining()
					) {
						this.ui.setMode('room-selection');
					}
					// If auto-join is happening, stay in connecting mode until it completes
				} else if (
					state.network.status === 'disconnected' ||
					state.network.status === 'connecting'
				) {
					// Show connecting mode when disconnected or connecting (blank the room pane)
					this.ui.setMode('connecting');
				}
			}
		});
		addEventListener('graph:search', this.handleGraphSearch);
		addEventListener('graph:clearSearch', this.handleGraphClearSearch);
		addEventListener('graph:layoutChange', this.handleGraphLayoutChange);
		addEventListener('graph:fit', this.handleGraphFit);
		addEventListener('graph:requestProps', this.handleRequestProps);

		// Room lifecycle events
		addEventListener('room:joining', this.onRoomJoining);
		addEventListener('room:joined', this.onRoomJoined);
		addEventListener('room:leaving', this.onRoomLeaving);
		addEventListener('room:left', this.onRoomLeft);
	}

	setupResizeHandler() {
		// Store reference to resize handler for cleanup
		this.resizeHandler = () => {
			if (
				this.ui &&
				this.ui.visualization &&
				this.ui.visualization.isInitialized()
			) {
				this.ui.handleResizeGraph();
			}
		};

		// Handle window resize to ensure Cytoscape canvas stays properly sized
		window.addEventListener('resize', this.resizeHandler);
	}

	// Bridge method for Room component to call - fires UI event
	onJoinRoom(roomName) {
		// Fire UI event for room service to handle
		dispatchEvent('ui:joinRoom', roomName);
	}

	onRoomLeft() {
		this.ui.handleRoomLeft();
	}

	onNodeCreate(detail) {
		this.graphOperations.upsertNode(detail.data, this.connection);
	}

	onNodeDelete(detail) {
		this.graphOperations.deleteNode(detail.id);
	}

	onEdgeCreate(detail) {
		this.graphOperations.upsertEdge(detail.data, this.connection);
	}

	onEdgeDelete(detail) {
		this.graphOperations.deleteEdge(detail.id);
	}

	// Room lifecycle event handlers
	onRoomJoining(event) {
		const { room } = event.detail;
		// Update UI to show joining state
		this.ui.setMode('connecting');
	}

	onRoomJoined(event) {
		const { room } = event.detail;
		// Full room setup
		this.currentRoom = room;
		this.ui.setMode('room-mode');
		this.stateManager.setRoomJoined(room);
		this.updateRoomHash(room);
		this.ui.handleRoomJoined(room);

		// Update gunWrapper with current room
		this.gunWrapper = new GunDBWrapper(this.connection, this.currentRoom);
	}

	onRoomLeaving(event) {
		this.ui.setMode('connecting');
	}

	onRoomLeft(event) {
		// Full room cleanup
		this.currentRoom = null;
		this.stateManager.setRoomLeft();
		this.updateRoomHash(null);
		// Switch UI back to room selection
		this.ui.setMode('room-selection');
		this.ui.handleRoomLeft();

		// Clear gunWrapper references
		this.gunWrapper = new GunDBWrapper(this.connection, null);
	}

	updateRoomHash(roomName) {
		if (roomName) {
			window.location.hash = `#${roomName}`;
		} else {
			window.location.hash = '';
		}
	}

	handleGraphExport(e) {
		const { room } = e.detail;
		if (!room) return;

		try {
			// Dispatch event instead of direct service call
			dispatchEvent('room:exportRequested', { room });
		} catch (error) {
			log('Error exporting graph:', error);
		}
	}

	handleGraphImport(e) {
		const { room, data } = e.detail;
		if (!room || !data) return;

		try {
			// Dispatch event instead of direct service call
			dispatchEvent('room:importRequested', { room, data });
		} catch (error) {
			log('Error importing graph:', error);
		}
	}

	handleRoomExportCompleted(e) {
		const { room, data } = e.detail;
		if (!data) return;

		try {
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${room}-export-${
				new Date().toISOString().split('T')[0]
			}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			log('Error handling export completion:', error);
		}
	}

	handleRoomImportCompleted(e) {
		const { room, success } = e.detail;
		if (success) {
			log('Graph data imported successfully');
		}
	}

	handleGraphClearLocal(e) {
		const { room } = e.detail;
		if (!room) return;

		try {
			const keys = Object.keys(localStorage);
			keys.forEach((key) => {
				if (key.includes(room)) {
					localStorage.removeItem(key);
				}
			});
			log('Local cache cleared for room:', room);
		} catch (error) {
			log('Error clearing local cache:', error);
		}
	}

	handleGraphSearch({ room, query }) {
		if (!room || !query) return;
		dispatchEvent('graph:searchRequested', { room, query });
	}

	handleGraphClearSearch({ room } = {}) {
		if (!room) return;
		dispatchEvent('graph:searchCleared', { room });
	}

	handleGraphLayoutChange({ room, layout } = {}) {
		if (!room || !layout) return;
		dispatchEvent('graph:layoutChange', { room, layout });
	}

	handleGraphFit({ room } = {}) {
		if (!room) return;
		dispatchEvent('graph:fitRequested', { room });
	}

	async handleRequestProps(e) {
		const { elementId, elementType, room } = e.detail;
		if (!elementId || !room || !elementType) {
			return;
		}

		// Set props loading flag via event
		dispatchEvent('sync:setPropsLoadingFlag', { value: true });

		try {
			let props;
			try {
				if (elementType === 'node') {
					props = await this.gunWrapper.getNodeProps(room, elementId);
					await this.gunWrapper.getNodeFullData(room, elementId);
				} else if (elementType === 'edge') {
					props = await this.gunWrapper.getEdgeProps(room, elementId);
				} else {
					throw new Error(`Unknown element type: ${elementType}`);
				}
			} catch (error) {
				if (elementType === 'node') {
					props = await this.gunWrapper.getPropsFallback(
						room,
						elementId,
						true
					);
				} else if (elementType === 'edge') {
					props = await this.gunWrapper.getPropsFallback(
						room,
						elementId,
						false
					);
				}
			}

			dispatchEvent('graph:propsLoaded', {
				elementId,
				elementType,
				props,
				room,
			});
		} catch (error) {
			dispatchEvent('graph:propsLoaded', {
				elementId,
				elementType,
				props: {},
				room,
			});
		} finally {
			// Clear props loading flag via event
			dispatchEvent('sync:setPropsLoadingFlag', { value: false });
		}
	}

	getCurrentRoom() {
		return this.currentRoom;
	}

	isInRoom() {
		return !!this.currentRoom;
	}
}
