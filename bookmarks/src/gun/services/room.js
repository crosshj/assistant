import { log, dispatchEvent, addEventListener } from '../_lib/utils.js';

// Room Management
export class RoomService {
	constructor() {
		this.gun = null; // Will be set via setConnection()
		this.currentRoom = null;
		this.graphRoot = null;
		this.nodesChain = null;
		this.edgesChain = null;

		// Listen to UI events directly
		this.setupUIEventListeners();
	}

	setConnection(gun) {
		this.gun = gun;
	}

	setupUIEventListeners() {
		// Listen to join room requests from UI
		addEventListener('ui:joinRoom', (event) => {
			const roomName = event.detail;
			if (roomName) {
				this.joinRoom(roomName);
			}
		});

		// Listen to leave room requests from UI
		addEventListener('ui:leaveRoom', () => {
			this.leaveRoom();
		});

		// Listen to export requests
		addEventListener('room:exportRequested', async (event) => {
			const { room } = event.detail;
			const data = await this.exportRoom(room);
			if (data) {
				// Dispatch result back to UI
				dispatchEvent('room:exportCompleted', { room, data });
			}
		});

		// Listen to import requests
		addEventListener('room:importRequested', (event) => {
			const { room, data } = event.detail;
			alert('Feature not implemented yet');
			dispatchEvent('room:importCompleted', { room, success: false });
			// const result = this.importRoomData(data);
			// if (result) {
			// 	dispatchEvent('room:importCompleted', { room, success: true });
			// }
		});

		// Listen to graph operation requests
		addEventListener('room:upsertNode', (event) => {
			this.upsertNode(event.detail);
		});

		addEventListener('room:deleteNode', (event) => {
			this.deleteNode(event.detail.id);
		});

		addEventListener('room:upsertEdge', (event) => {
			this.upsertEdge(event.detail);
		});

		addEventListener('room:deleteEdge', (event) => {
			this.deleteEdge(event.detail.id);
		});
	}

	// Room events are now dispatched as DOM events

	joinRoom(room) {
		if (!room) return false;

		// Trust that the StateManager has already verified the connection is ready
		// The connection check is now handled at the EventCoordinator level

		// 1. START joining - UI can show joining state
		dispatchEvent('room:joining', { room });

		this.currentRoom = room;
		this.graphRoot = this.gun.get('graphs').get(room);

		// Flag to track if join has completed
		let joinCompleted = false;

		// Gun.js operations are asynchronous, so we need to wait for the operation to complete
		// before marking the room as joined
		this.graphRoot.once((data, ack) => {
			if (!joinCompleted) {
				joinCompleted = true;

				// Room is fully ready - fire joined event

				dispatchEvent('room:joined', {
					room,
					graphRoot: this.graphRoot,
				});
			}
		});

		// Fallback: If Gun.js callback doesn't fire within 1 second, assume the room is accessible
		// This handles cases where the room might be empty or the callback doesn't fire
		setTimeout(() => {
			if (!joinCompleted && this.currentRoom === room && this.graphRoot) {
				joinCompleted = true;

				// Room is fully ready - fire joined event

				dispatchEvent('room:joined', {
					room,
					graphRoot: this.graphRoot,
				});
			} else if (joinCompleted) {
				// Timeout fallback skipped - callback already fired
			}
		}, 1000);

		// Return true to indicate the join process has started
		return true;
	}

	getCurrentRoom() {
		return this.currentRoom;
	}

	getGraphRoot() {
		return this.graphRoot;
	}

	isInRoom() {
		return !!this.currentRoom && !!this.graphRoot;
	}

	leaveRoom() {
		const currentRoom = this.currentRoom;

		// 1. START leaving - UI can show leaving state
		dispatchEvent('room:leaving', { room: currentRoom });

		if (this.nodesChain) this.nodesChain.off();
		if (this.edgesChain) this.edgesChain.off();

		this.currentRoom = null;
		this.graphRoot = null;
		this.nodesChain = null;
		this.edgesChain = null;

		// 2. FULLY left - All cleanup complete
		dispatchEvent('room:left', {
			room: null,
			graphRoot: null,
		});
		// log('left room');
	}

	// Export room data function
	async exportRoom(room) {
		if (!room) return null;

		const nodes = {};
		const edges = {};

		return new Promise((resolve) => {
			const graphRoot = this.gun.get('graphs').get(room);
			const nodesChain = graphRoot.get('nodes').map();
			const edgesChain = graphRoot.get('edges').map();

			let nodeCount = 0;
			let edgeCount = 0;

			nodesChain.on((data, id) => {
				if (data) {
					nodes[id] = data;
					nodeCount++;
				}
			});

			edgesChain.on((data, id) => {
				if (data) {
					edges[id] = data;
					edgeCount++;
				}
			});

			// Wait a bit for data to load, then resolve
			setTimeout(() => {
				log(
					`Exporting ${nodeCount} nodes and ${edgeCount} edges from room: ${room}`
				);
				resolve({
					room,
					nodes,
					edges,
					metadata: {
						exportedAt: new Date().toISOString(),
						nodeCount,
						edgeCount,
					},
				});
			}, 1000);
		});
	}

	// Import room data function
	importRoomData(data) {
		if (!this.isInRoom()) {
			log('join a room first');
			return false;
		}

		if (!data || !data.nodes || !data.edges) {
			log('invalid import data');
			return false;
		}

		for (const n of data.nodes || []) {
			this.graphRoot
				.get('nodes')
				.get(n.id || this.generateId())
				.put(n);
		}

		for (const e of data.edges || []) {
			this.graphRoot
				.get('edges')
				.get(e.id || this.generateId())
				.put(e);
		}

		log('imported data');
		return true;
	}

	generateId() {
		return crypto.randomUUID
			? crypto.randomUUID()
			: Math.random().toString(16).slice(2) + Date.now().toString(16);
	}

	// Graph operations - moved from GraphOperations class
	upsertNode({ id, label, props }) {
		if (!this.isInRoom()) {
			log('⚠️ Cannot create node: Not in a room');
			return false;
		}

		const nid = id || this.generateId();
		const node = {
			id: nid,
			label: label || '',
			props: props || {},
			updatedAt: Date.now(),
		};

		try {
			this.graphRoot.get('nodes').get(nid).put(node);
			log('✅ Node created: ' + nid);
			return true;
		} catch (error) {
			log('❌ Failed to create node: ' + error.message);
			return false;
		}
	}

	deleteNode(id) {
		if (!this.isInRoom() || !id) return false;

		try {
			this.graphRoot.get('nodes').get(id).put(null);
			log('node deleted ' + id);
			return true;
		} catch (error) {
			log('❌ Failed to delete node: ' + error.message);
			return false;
		}
	}

	upsertEdge({ id, from, to, label, direction, props }) {
		if (!this.isInRoom()) {
			log('⚠️ Cannot create edge: Not in a room');
			return false;
		}

		if (!from || !to) {
			log('⚠️ Cannot create edge: Missing from/to nodes');
			return false;
		}

		const eid = id || this.generateId();
		const edge = {
			id: eid,
			from,
			to,
			label: label || '',
			direction: direction || 'forward',
			props: props || {},
			updatedAt: Date.now(),
		};

		try {
			this.graphRoot.get('edges').get(eid).put(edge);
			log('✅ Edge created: ' + eid);
			return true;
		} catch (error) {
			log('❌ Failed to create edge: ' + error.message);
			return false;
		}
	}

	deleteEdge(id) {
		if (!this.isInRoom() || !id) return false;

		try {
			this.graphRoot.get('edges').get(id).put(null);
			log('edge deleted ' + id);
			return true;
		} catch (error) {
			log('❌ Failed to delete edge: ' + error.message);
			return false;
		}
	}
}
