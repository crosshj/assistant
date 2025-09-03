import { dispatchEvent } from '../_lib/utils.js';

/**
 * Connection handlers - handles all connection-related events
 * Only dispatches events and interacts with appController.gun
 * Returns bound methods for AppController to use
 */
export function getHandlers(appController) {
	// Internal methods (not exported as events)
	function getDefaultPeers() {
		// TODO: Move from services/connection.js getDefaultPeers()
	}

	function createIsolatedInstance() {
		// TODO: Move from services/connection.js createIsolatedInstance()
	}

	function monitorConnections() {
		// TODO: Move from services/connection.js monitorConnections()
	}

	function updateConnectionStatusFromPeers() {
		// TODO: Move from services/connection.js updateConnectionStatusFromPeers()
	}

	function updateConnectionStatus(connected, total) {
		// TODO: Move from services/connection.js updateConnectionStatus()
	}

	function getDetailedPeerInfo() {
		// TODO: Move from services/connection.js getDetailedPeerInfo()
	}

	function getNetworkInfo() {
		// TODO: Move from services/connection.js getNetworkInfo()
	}

	function isConnected() {
		// TODO: Move from services/connection.js isConnected()
	}

	function autoLogin() {
		// TODO: Move from services/connection.js autoLogin()
	}

	function startMonitoring() {
		// TODO: Move from services/connection.js startMonitoring()
	}

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
