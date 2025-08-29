import { GunDBWrapper } from '../lib/gunWrapper.js';
import { log } from '../lib/utils.js';
import { Room } from './Room.js';

/**
 * RoomController
 * Handles all room-related events and business logic
 * Coordinates between UI components and services
 */
export class RoomController {
	constructor(
		roomService,
		syncService,
		connection,
		stateManager,
		graphOperations
	) {
		this.roomService = roomService;
		this.syncService = syncService;
		this.connection = connection;
		this.stateManager = stateManager;
		this.graphOperations = graphOperations;

		// TODO: Remove direct gunWrapper usage - should go through App Controller instead
		// This creates coupling that should be resolved when we have proper event-driven architecture
		this.gunWrapper = new GunDBWrapper(connection);

		// Current room state
		this.currentRoom = null;
		this.visualization = null;

		// Create Room component with controller reference
		this.ui = new Room({ controller: this });

		// Bind methods to preserve context
		this.onJoinRoom = this.onJoinRoom.bind(this);
		this.onLeaveRoom = this.onLeaveRoom.bind(this);
		this.onRoomStatusChanged = this.onRoomStatusChanged.bind(this);

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

	setupEventListeners() {
		// Room events
		document.addEventListener('ui:joinRoom', (e) => {
			const roomName = e.detail;
			if (roomName) {
				this.onJoinRoom(roomName);
			}
		});
		document.addEventListener('ui:leaveRoom', () => {
			this.roomService.leaveRoom();
			this.ui.leaveRoom();
		});
		document.addEventListener('room:left', this.handleRoomLeft);

		// Room pane events from Header
		document.addEventListener('ui:showConnectingSpinner', () => {
			// Show connecting spinner when user actively clicks Connect
			this.ui.showConnectingSpinner();
		});

		// Sync events
		this.syncService.on('clearGraph', this.handleClearGraph);
		this.syncService.on('addNode', this.syncAddNode);
		this.syncService.on('removeNode', this.syncRemoveNode);
		this.syncService.on('addEdge', this.syncAddEdge);
		this.syncService.on('removeEdge', this.syncRemoveEdge);

		// Graph events
		document.addEventListener('graph:export', this.handleGraphExport);
		document.addEventListener('graph:import', this.handleGraphImport);
		document.addEventListener(
			'graph:clearLocal',
			this.handleGraphClearLocal
		);

		// State change events - handle room pane visibility based on network status
		document.addEventListener('stateChanged', (event) => {
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
		document.addEventListener('graph:search', this.handleGraphSearch);
		document.addEventListener(
			'graph:clearSearch',
			this.handleGraphClearSearch
		);
		document.addEventListener(
			'graph:layoutChange',
			this.handleGraphLayoutChange
		);
		document.addEventListener('graph:fit', this.handleGraphFit);
		document.addEventListener(
			'graph:requestProps',
			this.handleRequestProps
		);

		this.roomService.on('roomStatusChanged', this.onRoomStatusChanged);
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

	onJoinRoom(roomName) {
		if (!roomName) return;
		this.stateManager.setRoomJoining(roomName);
		const result = this.roomService.joinRoom(roomName, this.connection);
		if (!result) {
			this.stateManager.setRoomLeft();
		}
	}

	onLeaveRoom() {
		this.roomService.leaveRoom();
		this.ui.leaveRoom();
	}

	onRoomLeft() {
		this.ui.handleRoomLeft();
	}

	onNodeCreate(detail) {
		console.log('🔍 RoomController.onNodeCreate called with:', detail);
		this.graphOperations.upsertNode(detail.data, this.connection);
	}

	onNodeDelete(detail) {
		console.log('🔍 RoomController.onNodeDelete called with:', detail);
		this.graphOperations.deleteNode(detail.id);
	}

	onEdgeCreate(detail) {
		console.log('🔍 RoomController.onEdgeCreate called with:', detail);
		this.graphOperations.upsertEdge(detail.data, this.connection);
	}

	onEdgeDelete(detail) {
		console.log('🔍 RoomController.onEdgeDelete called with:', detail);
		this.graphOperations.deleteEdge(detail.id);
	}

	onRoomStatusChanged(status, roomName) {
		if (status === roomName && roomName) {
			this.currentRoom = roomName;
			this.stateManager.setRoomJoined(roomName);
			this.updateRoomHash(roomName);
			this.ui.handleRoomJoined(roomName);
			if (this.roomService.isInRoom() && this.syncService) {
				this.syncService.subscribeToRoom();
			}
		} else if (status && status.includes('🏠') && roomName) {
			this.currentRoom = roomName;
			this.stateManager.setRoomJoined(roomName);
			this.updateRoomHash(roomName);
			this.ui.handleRoomJoined(roomName);
			if (this.roomService.isInRoom() && this.syncService) {
				this.syncService.subscribeToRoom();
			}
		} else if (status === 'not joined') {
			this.currentRoom = null;
			this.stateManager.setRoomLeft();
			this.updateRoomHash(null);
			this.ui.handleRoomLeft();
		}
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
			this.roomService.exportRoom(room).then((data) => {
				if (data) {
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
				}
			});
		} catch (error) {
			log('Error exporting graph:', error);
		}
	}

	handleGraphImport(e) {
		const { room, data } = e.detail;
		if (!room || !data) return;

		try {
			const result = this.roomService.importRoomData(data);
			if (result) {
				log('Graph data imported successfully');
			}
		} catch (error) {
			log('Error importing graph:', error);
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

	handleGraphSearch(e) {
		const { room, query } = e.detail;
		if (!room || !query) return;

		document.dispatchEvent(
			new CustomEvent('graph:searchRequested', {
				detail: { room, query },
			})
		);
	}

	handleGraphClearSearch(e) {
		const { room } = e.detail;
		if (!room) return;

		document.dispatchEvent(
			new CustomEvent('graph:searchCleared', {
				detail: { room },
			})
		);
	}

	handleGraphLayoutChange(e) {
		const { room, layout } = e.detail;
		if (!room || !layout) return;

		document.dispatchEvent(
			new CustomEvent('graph:layoutChangeRequested', {
				detail: { room, layout },
			})
		);
	}

	handleGraphFit(e) {
		const { room } = e.detail;
		if (!room) return;

		document.dispatchEvent(
			new CustomEvent('graph:fitRequested', {
				detail: { room },
			})
		);
	}

	async handleRequestProps(e) {
		const { elementId, elementType, room } = e.detail;
		if (!elementId || !room || !elementType) {
			return;
		}

		if (this.syncService) {
			this.syncService.setPropsLoadingFlag(true);
		}

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

			document.dispatchEvent(
				new CustomEvent('graph:propsLoaded', {
					detail: {
						elementId,
						elementType,
						props,
						room,
					},
				})
			);
		} catch (error) {
			document.dispatchEvent(
				new CustomEvent('graph:propsLoaded', {
					detail: {
						elementId,
						elementType,
						props: {},
						room,
					},
				})
			);
		} finally {
			if (this.syncService) {
				this.syncService.setPropsLoadingFlag(false);
			}
		}
	}

	getCurrentRoom() {
		return this.currentRoom;
	}

	isInRoom() {
		return !!this.currentRoom;
	}

	destroy() {
		// Remove resize event listener
		if (this.resizeHandler) {
			window.removeEventListener('resize', this.resizeHandler);
		}

		document.removeEventListener('graph:export', this.handleGraphExport);
		document.removeEventListener('graph:import', this.handleGraphImport);
		document.removeEventListener(
			'graph:clearLocal',
			this.handleGraphClearLocal
		);
		document.removeEventListener('graph:search', this.handleGraphSearch);
		document.removeEventListener(
			'graph:clearSearch',
			this.handleGraphClearSearch
		);
		document.removeEventListener(
			'graph:layoutChange',
			this.handleGraphLayoutChange
		);
		document.removeEventListener('graph:fit', this.handleGraphFit);
		document.removeEventListener(
			'graph:requestProps',
			this.handleRequestProps
		);
	}
}
