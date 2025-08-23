import { log } from '../utils/utils.js';

// Data Synchronization between GunDB and Visualization
export class DataSync {
	constructor(roomManager, visualization) {
		this.roomManager = roomManager;
		this.visualization = visualization;
		this.nodesChain = null;
		this.edgesChain = null;
		this.isSubscribed = false;
	}

	subscribeToRoom() {
		if (!this.roomManager.isInRoom()) {
			log('⚠️ Cannot subscribe: Not in a room');
			return false;
		}

		if (!this.visualization.isInitialized()) {
			log('⚠️ Cytoscape not initialized yet');
			return false;
		}

		// Clear existing subscriptions
		this.unsubscribeFromRoom();

		// Clear the graph
		this.visualization.clearGraph();

		// Subscribe to nodes
		this.nodesChain = this.roomManager.getGraphRoot().get('nodes').map();
		this.nodesChain.on((data, id) => {
			try {
				if (!data) {
					this.visualization.removeNode(id);
					return;
				}
				this.visualization.addNode(data);
			} catch (error) {
				log('❌ Error syncing node: ' + error.message);
			}
		});

		// Subscribe to edges
		this.edgesChain = this.roomManager.getGraphRoot().get('edges').map();
		this.edgesChain.on((data, id) => {
			try {
				if (!data) {
					this.visualization.removeEdge(id);
					return;
				}
				this.visualization.addEdge(data);
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

		// Clear current visualization
		this.visualization.clearGraph();

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
			visualizationReady: this.visualization.isInitialized(),
		};
	}
}
