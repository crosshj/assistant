import { dispatchEvent } from '../_lib/utils.js';

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
			// TODO: Move from services/connection.js handleNetworkInfoRequest()
		},
	};
}
