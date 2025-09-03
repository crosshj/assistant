/**
 * Connection handlers - handles all connection-related events
 * Only dispatches events and interacts with appController.gun
 * Returns bound methods for AppController to use
 */
export function getHandlers(appController) {
	return {
		discovery(event) {
			// TODO: Move from services/connection.js handleNetworkDiscovery()
		},

		connect(event) {
			// TODO: Move from services/connection.js handleConnect()
		},

		disconnect(event) {
			// TODO: Move from services/connection.js handleDisconnect()
		},

		test(event) {
			// TODO: Move from services/connection.js handleTestConnection()
		},

		identityCreate(event) {
			// TODO: Move from services/connection.js handleCreateIdentity()
		},

		login(event) {
			// TODO: Move from services/connection.js handleLogin()
		},

		info(event) {
			// TODO: Move from services/connection.js getDetailedPeerInfo() and getNetworkInfo()
			// NOTE: ConnectionController currently calls connection service directly
			// Need to: 1) Make ConnectionController dispatch 'network:infoRequest' event
			//         2) This handler responds with network info via dispatchEvent
			//         3) ConnectionController/UI listens for the response event
		},
	};
}
