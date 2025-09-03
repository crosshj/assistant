/**
 * Room handlers - handles all room-related events
 * Only dispatches events and interacts with appController.gun
 * Returns bound methods for AppController to use
 */
export function getHandlers(appController) {
	return {
		join(event) {
			// TODO: Move from services/room.js joinRoom()
		},

		leave(event) {
			// TODO: Move from services/room.js leaveRoom()
		},

		export(event) {
			// TODO: Move from services/room.js exportRoom()
		},

		import(event) {
			// TODO: Move from services/room.js importRoomData()
		},
	};
}
