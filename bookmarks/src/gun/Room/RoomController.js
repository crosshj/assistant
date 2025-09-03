import { log, addEventListener, dispatchEvent } from '../_lib/utils.js';
import { Room } from './Room.js';

/**
 * RoomController
 * Handles all room-related events and business logic
 * Coordinates between UI components and services
 */
export class RoomController {
	constructor() {
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

		// Setup event listeners
		this.setupEventListeners();

		// Setup resize handler
		this.setupResizeHandler();
	}

	// setConnection removed - controller is decoupled from services

	setupEventListeners() {
		// Network events
		addEventListener('network:connecting', () => {
			// Show connecting spinner when connecting begins
			this.ui.showConnectingSpinner();
		});

		addEventListener('network:disconnected', () => {
			// Enter connecting/blank state when user disconnects from network
			this.ui.setMode('connecting');
			// Clear any rendered graph to avoid showing stale data
			this.handleClearGraph();
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

		// Network status changes are now handled by direct network events from EventCoordinator
		// Room pane visibility is managed by room lifecycle events
		addEventListener('graph:search', this.handleGraphSearch);
		addEventListener('graph:clearSearch', this.handleGraphClearSearch);
		addEventListener('graph:layoutChange', this.handleGraphLayoutChange);
		addEventListener('graph:fit', this.handleGraphFit);

		// Room lifecycle events
		addEventListener('room:joining', this.onRoomJoining);
		addEventListener('room:joined', this.onRoomJoined);
		addEventListener('room:leaving', this.onRoomLeaving);
		addEventListener('room:left', this.onRoomLeft);

		// Props UI events
		addEventListener('graph:select', (e) => {
			this.handleSelectionChanged(e.detail);
		});
		addEventListener('graph:propsLoaded', (e) => {
			this.handlePropsLoaded(e.detail);
		});
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
		dispatchEvent('graph:nodeUpsert', detail.data);
	}

	onNodeDelete(detail) {
		dispatchEvent('graph:nodeDelete', { id: detail.id });
	}

	onEdgeCreate(detail) {
		dispatchEvent('graph:edgeUpsert', detail.data);
	}

	onEdgeDelete(detail) {
		dispatchEvent('graph:edgeDelete', { id: detail.id });
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
		this.ui.setMode('room-mode');
		this.updateRoomHash(room);
		this.ui.handleRoomJoined(room);
	}

	onRoomLeaving(event) {
		this.ui.setMode('connecting');
	}

	onRoomLeft(event) {
		// Full room cleanup
		this.updateRoomHash(null);
		// Switch UI back to room selection
		this.ui.setMode('room-selection');
		this.ui.handleRoomLeft();
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

	// Props UI handling methods (delegated to Room UI component)
	handleSelectionChanged(detail) {
		const { elementType } = detail;
		this.ui.startPropsLoading(elementType);
	}

	handlePropsLoaded(detail) {
		const { elementId, elementType, props, room } = detail;
		if (!elementId || !elementType || !props) {
			return;
		}
		this.ui.updatePropsField(elementType, props);
	}
}
