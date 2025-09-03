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
			// TODO: Move from services/room.js upsertNode()
		},

		nodeDelete(event) {
			// TODO: Move from services/room.js deleteNode()
		},

		edgeUpsert(event) {
			// TODO: Move from services/room.js upsertEdge()
		},

		edgeDelete(event) {
			// TODO: Move from services/room.js deleteEdge()
		},
	};
}
