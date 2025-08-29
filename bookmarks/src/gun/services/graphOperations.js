import { log, uuid } from '../lib/utils.js';

// Graph Operations - Node and Edge Management
export class GraphOperations {
	constructor(roomManager, connection) {
		this.roomManager = roomManager;
		this.connection = connection;
	}

	upsertNode({ id, label, props }, connectionManager) {
		if (!this.roomManager.isInRoom()) {
			log('⚠️ Cannot create node: Not in a room');
			return false;
		}

		// Check connection status
		if (!connectionManager.isConnected()) {
			// Only show this error once per session
			if (!window.connectionErrorShown) {
				log('⚠️ Cannot create node: No peer connections available');
				window.connectionErrorShown = true;
			}
			return false;
		}

		const nid = id || uuid();
		const node = {
			id: nid,
			label: label || '',
			props: props || {},
			updatedAt: Date.now(),
			by: this.connection.getCurrentUser(),
		};

		try {
			this.roomManager.getGraphRoot().get('nodes').get(nid).put(node);
			log('✅ Node created: ' + nid);
			return true;
		} catch (error) {
			log('❌ Failed to create node: ' + error.message);
			return false;
		}
	}

	deleteNode(id) {
		if (!this.roomManager.isInRoom() || !id) return false;

		try {
			this.roomManager.getGraphRoot().get('nodes').get(id).put(null);
			log('node deleted ' + id);
			return true;
		} catch (error) {
			log('❌ Failed to delete node: ' + error.message);
			return false;
		}
	}

	upsertEdge({ id, from, to, label, direction, props }, connectionManager) {
		if (!this.roomManager.isInRoom()) {
			log('⚠️ Cannot create edge: Not in a room');
			return false;
		}

		if (!from || !to) {
			log('⚠️ Cannot create edge: Missing from/to nodes');
			return false;
		}

		// Check connection status
		if (!connectionManager.isConnected()) {
			// Only show this error once per session
			if (!window.connectionErrorShown) {
				log('⚠️ Cannot create edge: No peer connections available');
				window.connectionErrorShown = true;
			}
			return false;
		}

		const eid = id || uuid();
		const edge = {
			id: eid,
			from,
			to,
			label: label || '',
			direction: direction || 'forward',
			props: props || {},
			updatedAt: Date.now(),
			by: this.connection.getCurrentUser(),
		};

		try {
			this.roomManager.getGraphRoot().get('edges').get(eid).put(edge);
			log('✅ Edge created: ' + eid);
			return true;
		} catch (error) {
			log('❌ Failed to create edge: ' + error.message);
			return false;
		}
	}

	deleteEdge(id) {
		if (!this.roomManager.isInRoom() || !id) return false;

		try {
			this.roomManager.getGraphRoot().get('edges').get(id).put(null);
			log('edge deleted ' + id);
			return true;
		} catch (error) {
			log('❌ Failed to delete edge: ' + error.message);
			return false;
		}
	}

	// Get node by ID
	getNode(id) {
		if (!this.roomManager.isInRoom() || !id) return null;

		return new Promise((resolve) => {
			this.roomManager
				.getGraphRoot()
				.get('nodes')
				.get(id)
				.once((data) => {
					resolve(data);
				});
		});
	}

	// Get edge by ID
	getEdge(id) {
		if (!this.roomManager.isInRoom() || !id) return null;

		return new Promise((resolve) => {
			this.roomManager
				.getGraphRoot()
				.get('edges')
				.get(id)
				.once((data) => {
					resolve(data);
				});
		});
	}

	// Get all nodes
	getAllNodes() {
		if (!this.roomManager.isInRoom()) return null;

		return new Promise((resolve) => {
			const nodes = {};
			let count = 0;

			this.roomManager
				.getGraphRoot()
				.get('nodes')
				.map()
				.on((data, id) => {
					if (data) {
						nodes[id] = data;
						count++;
					}
				});

			// Wait a bit for data to load
			setTimeout(() => resolve({ nodes, count }), 500);
		});
	}

	// Get all edges
	getAllEdges() {
		if (!this.roomManager.isInRoom()) return null;

		return new Promise((resolve) => {
			const edges = {};
			let count = 0;

			this.roomManager
				.getGraphRoot()
				.get('edges')
				.map()
				.on((data, id) => {
					if (data) {
						edges[id] = data;
						count++;
					}
				});

			// Wait a bit for data to load
			setTimeout(() => resolve({ edges, count }), 500);
		});
	}
}
