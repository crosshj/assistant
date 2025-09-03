import { log, generateId } from '../_lib/utils.js';

/**
 * Graph handlers - handles all graph-related events
 * Only dispatches events and interacts with appController.gun
 * Returns bound methods for AppController to use
 */
export function getHandlers(appController) {
	return {
		select(event) {
			// TODO: Move from services/sync.js handleRequestProps()
		},

		nodeUpsert(event) {
			const { id, label, props } = event.detail;

			// Check if we're in a room
			if (!appController.currentRoom) {
				log('⚠️ Cannot create node: Not in a room');
				return false;
			}

			const graphRoot = appController.graphRoot;

			const nid = id || generateId();
			const node = {
				id: nid,
				label: label || '',
				props: props || {},
				updatedAt: Date.now(),
			};

			try {
				graphRoot.get('nodes').get(nid).put(node);
				log('✅ Node created: ' + nid);
				return true;
			} catch (error) {
				log('❌ Failed to create node: ' + error.message);
				return false;
			}
		},

		nodeDelete(event) {
			const { id } = event.detail;

			if (!id) return false;

			// Check if we're in a room
			if (!appController.currentRoom) return false;

			const graphRoot = appController.graphRoot;

			try {
				graphRoot.get('nodes').get(id).put(null);
				log('node deleted ' + id);
				return true;
			} catch (error) {
				log('❌ Failed to delete node: ' + error.message);
				return false;
			}
		},

		edgeUpsert(event) {
			const { id, from, to, label, direction, props } = event.detail;

			// Check if we're in a room
			if (!appController.currentRoom) {
				log('⚠️ Cannot create edge: Not in a room');
				return false;
			}

			const graphRoot = appController.graphRoot;

			if (!from || !to) {
				log('⚠️ Cannot create edge: Missing from/to nodes');
				return false;
			}

			const eid = id || generateId();
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
				graphRoot.get('edges').get(eid).put(edge);
				log('✅ Edge created: ' + eid);
				return true;
			} catch (error) {
				log('❌ Failed to create edge: ' + error.message);
				return false;
			}
		},

		edgeDelete(event) {
			const { id } = event.detail;

			if (!id) return false;

			// Check if we're in a room
			if (!appController.currentRoom) return false;

			const graphRoot = appController.graphRoot;

			try {
				graphRoot.get('edges').get(id).put(null);
				log('edge deleted ' + id);
				return true;
			} catch (error) {
				log('❌ Failed to delete edge: ' + error.message);
				return false;
			}
		},
	};
}
