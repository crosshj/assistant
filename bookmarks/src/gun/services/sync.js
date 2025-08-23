import { log } from '../utils/utils.js';

// Data Synchronization between GunDB and UI
export class DataSync {
	constructor(roomManager) {
		this.roomManager = roomManager;
		this.nodesChain = null;
		this.edgesChain = null;
		this.isSubscribed = false;
		this.eventListeners = new Map();
	}

	// Event system for UI components to listen to
	on(event, callback) {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}
		this.eventListeners.get(event).push(callback);
	}

	emit(event, data) {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.forEach((callback) => callback(data));
		}
	}

	subscribeToRoom() {
		if (!this.roomManager.isInRoom()) {
			log('⚠️ Cannot subscribe: Not in a room');
			return false;
		}

		// Clear existing subscriptions
		this.unsubscribeFromRoom();

		// Emit event for UI to clear graph
		this.emit('clearGraph');

		// Subscribe to nodes
		this.nodesChain = this.roomManager.getGraphRoot().get('nodes').map();
		this.nodesChain.on((data, id) => {
			try {
				if (!data) {
					this.emit('removeNode', { id });
					return;
				}
				this.emit('addNode', { data, id });
			} catch (error) {
				log('❌ Error syncing node: ' + error.message);
			}
		});

		// Subscribe to edges
		this.edgesChain = this.roomManager.getGraphRoot().get('edges').map();
		this.edgesChain.on((data, id) => {
			try {
				if (!data) {
					this.emit('removeEdge', { id });
					return;
				}
				this.emit('addEdge', { data, id });
			} catch (error) {
				log('❌ Error syncing edge: ' + error.message);
			}
		});

		this.isSubscribed = true;
		log('✅ Subscribed to room data');
		return true;
	}

	unsubscribeFromRoom() {
		if (this.nodesChain) {
			this.nodesChain.off();
			this.nodesChain = null;
		}
		if (this.edgesChain) {
			this.edgesChain.off();
			this.edgesChain = null;
		}
		this.isSubscribed = false;
	}

	isSubscribedToRoom() {
		return this.isSubscribed;
	}

	// Force refresh of all data
	refreshData() {
		if (!this.roomManager.isInRoom()) {
			log('⚠️ Cannot refresh: Not in a room');
			return false;
		}

		// Emit event for UI to clear graph
		this.emit('clearGraph');

		// Re-subscribe to get fresh data
		this.subscribeToRoom();

		log('🔄 Refreshing room data');
		return true;
	}

	// Get current subscription status
	getSubscriptionStatus() {
		return {
			isSubscribed: this.isSubscribed,
			hasNodesChain: !!this.nodesChain,
			hasEdgesChain: !!this.edgesChain,
			isInRoom: this.roomManager.isInRoom(),
		};
	}
}
