import { log, $ } from '../utils/utils.js';

// Room Management
export class RoomManager {
	constructor(gun) {
		this.gun = gun;
		this.currentRoom = null;
		this.graphRoot = null;
		this.nodesChain = null;
		this.edgesChain = null;
	}

	joinRoom(room, connectionManager) {
		if (!room) return false;

		// Check if we have any peer connections
		if (!connectionManager.isConnected()) {
			// Only show this error once per session
			if (!window.connectionErrorShown) {
				log('⚠️ Cannot join room: No peer connections available');
				window.connectionErrorShown = true;
			}
			$('roomStatus').textContent = '⚠️ No connection';
			return false;
		}

		this.currentRoom = room;
		this.graphRoot = this.gun.get('graphs').get(room);
		$('roomStatus').textContent = `📊 ${room}`;

		log('joined room ' + room);
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
		if (this.nodesChain) this.nodesChain.off();
		if (this.edgesChain) this.edgesChain.off();

		this.currentRoom = null;
		this.graphRoot = null;
		this.nodesChain = null;
		this.edgesChain = null;

		$('roomStatus').textContent = 'not joined';
		log('left room');
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
}
