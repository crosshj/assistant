import { log } from '../lib/utils.js';
import { GunDBWrapper } from '../lib/gunWrapper.js';

// Data Synchronization between GunDB and UI
export class DataSync {
	constructor(roomManager, connection, stateManager) {
		this.roomManager = roomManager;
		this.connection = connection;
		this.stateManager = stateManager;
		this.gunWrapper = new GunDBWrapper(connection); // Use wrapper for data cleaning
		this.nodesChain = null;
		this.edgesChain = null;
		this.isSubscribed = false;
		this.eventListeners = new Map();
		this._isPaused = false; // Added for pausing/resuming
		this._propsLoadingFlag = false; // Added for props loading protection
		// this.pendingRemovals = new Map(); // COMMENTED OUT: Not using grace period logic anymore
	}

	setConnection(connection) {
		this.connection = connection;
		this.gunWrapper = new GunDBWrapper(connection);
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

	/**
	 * Temporarily pause data sync updates without unsubscribing
	 * This is useful for operations like props loading that shouldn't trigger sync events
	 */
	pauseDataSync() {
		this._isPaused = true;
	}

	/**
	 * Resume data sync updates after being paused
	 */
	resumeDataSync() {
		this._isPaused = false;
	}

	/**
	 * Check if data sync is currently paused
	 */
	get isPaused() {
		return this._isPaused || false;
	}

	/**
	 * Set the paused state
	 */
	set isPaused(value) {
		this._isPaused = value;
	}

	/**
	 * Set the props loading flag to prevent graph updates during props loading
	 */
	setPropsLoadingFlag(value) {
		const oldValue = this._propsLoadingFlag;
		this._propsLoadingFlag = value;
	}

	/**
	 * Check if props loading is in progress
	 */
	get isPropsLoading() {
		return this._propsLoadingFlag;
	}

	subscribeToRoom() {
		if (!this.roomManager.isInRoom()) {
			log('⚠️ Cannot subscribe: Not in a room');
			return false;
		}

		// Additional validation: ensure we have a valid graph root
		const graphRoot = this.roomManager.getGraphRoot();

		if (!graphRoot) {
			log('⚠️ Cannot subscribe: No graph root available');
			// Try again in a moment - room might not be fully ready yet
			setTimeout(() => {
				this.subscribeToRoom();
			}, 100);
			return false;
		}

		// Clear existing subscriptions
		this.unsubscribeFromRoom();

		// Emit event for UI to clear graph
		this.emit('clearGraph');

		// Log network status for debugging
		// log(
		// 	'🌐 Network: Starting room subscription (may be slow on poor connections)'
		// );

		try {
			// First, establish the subscription structure (but don't start syncing yet)
			this.nodesChain = graphRoot.get('nodes').map();
			this.edgesChain = graphRoot.get('edges').map();

			// Mark as subscribed BEFORE setting up the data handlers
			this.isSubscribed = true;
			log('✅ Subscribed to room data');

			// COMMENTED OUT: Delay that was causing timing issues
			// setTimeout(() => {
			// 	this._setupDataHandlers();
			// }, 50);

			// Set up data handlers immediately instead
			this._setupDataHandlers();

			return true;
		} catch (error) {
			log('❌ Error setting up room subscriptions: ' + error.message);
			this.unsubscribeFromRoom();
			return false;
		}
	}

	_setupDataHandlers() {
		if (!this.isSubscribed) return;

		log('🔄 Setting up data handlers for room data sync');

		try {
			// Subscribe to nodes
			this.nodesChain.on((data, id) => {
				try {
					// Check if props loading is in progress - skip updates if so
					if (this._propsLoadingFlag) {
						return;
					}

					const shortId = id.slice(0, 8);

					if (!data) {
						log(
							`🗑️ Node ${shortId}... received null data - removing from graph`
						);
						// Emit removeNode event for proper cleanup
						this.emit('removeNode', { id });
						return;
					}

					// Check if data is actually empty (GunDB sometimes sends empty objects)
					if (Object.keys(data).length === 0) {
						log(
							`🗑️ Node ${shortId}... received empty data object - removing from graph`
						);
						// Emit removeNode event for proper cleanup
						this.emit('removeNode', { id });
						return;
					}

					// Debug: Log the raw data structure
					// log(`🔍 Raw node data for ${shortId}:`, data);
					// log(
					// 	`🔍 Raw node data keys: [${Object.keys(data || {}).join(
					// 		', '
					// 	)}]`
					// );

					// TEMPORARY: Skip data cleaning to debug the issue
					// const cleanData = this.gunWrapper.cleanNodeData(data);

					// Create a minimal clean data structure for now
					const cleanData = {
						id: id,
						label: data?.label || 'unnamed',
						props: data?.props || {},
					};

					// Debug: Log the cleaned data
					// log(`🧹 Cleaned node data for ${shortId}:`, cleanData);

					// Truncate the ID for display but keep full ID in data
					const label = cleanData?.label || 'unnamed';
					log(
						`✅ Node synced: ${shortId}... (${label}) - data keys: [${Object.keys(
							cleanData || {}
						).join(', ')}]`
					);

					this.emit('addNode', { data: cleanData, id });
				} catch (error) {
					const shortId = id.slice(0, 8);
					log(
						'❌ Error syncing node: ' +
							error.message +
							` (ID: ${shortId}...)`
					);
				}
			});

			// Subscribe to edges
			this.edgesChain.on((data, id) => {
				try {
					// Check if props loading is in progress - skip updates if so
					if (this._propsLoadingFlag) {
						return;
					}

					const shortId = id.slice(0, 8);

					if (!data) {
						log(
							`🗑️ Edge ${shortId}... received null data - removing from graph`
						);
						// Emit removeEdge event for proper cleanup
						this.emit('removeEdge', { id });
						return;
					}

					// COMMENTED OUT: Complex grace period logic that was causing issues
					// if (this.pendingRemovals.has(id)) {
					// 	log(
					// 		`✅ Edge ${shortId}... data arrived, canceling pending removal`
					// 	);
					// 	clearTimeout(this.pendingRemovals.get(id));
					// 	clearTimeout(this.pendingRemovals.get(id));
					// 	this.pendingRemovals.delete(id);
					// }

					// Check if data is actually empty (GunDB sometimes sends empty objects)
					if (Object.keys(data).length === 0) {
						log(
							`🗑️ Edge ${shortId}... received empty data object - removing from graph`
						);
						// Emit removeEdge event for proper cleanup
						this.emit('removeEdge', { id });
						return;
					}

					// Check if source and target nodes exist before creating edge
					const sourceId = data.from || data.source;
					const targetId = data.to || data.target;

					if (sourceId && targetId) {
						// Truncate IDs for display
						const shortId = id.slice(0, 8);
						const shortSource = sourceId.slice(0, 8);
						const shortTarget = targetId.slice(0, 8);
						const label = data.label || 'unnamed';

						log(
							`📊 Edge synced: ${shortId}... (${shortSource}... → ${shortTarget}...) [${label}]`
						);

						// Use GunDBWrapper to clean the edge data (same as old working system)
						const cleanData = this.gunWrapper.cleanEdgeData(data);

						// Create edge immediately - placeholder nodes will be created if needed
						this.emit('addEdge', { data: cleanData, id });
					} else {
						// Edge data is missing source/target info
						const shortId = id.slice(0, 8);
						log(
							`⚠️ Edge ${shortId}... skipped - missing source or target information`
						);
					}
				} catch (error) {
					log('❌ Error syncing edge: ' + error.message);
				}
			});

			log('✅ Data handlers set up successfully');
		} catch (error) {
			log('❌ Error setting up data handlers: ' + error.message);
		}
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
		this._isPaused = false; // Reset paused state
		// this.processedEdges.clear(); // COMMENTED OUT: Not needed anymore

		// COMMENTED OUT: Not using grace period logic anymore
		// this.pendingRemovals.forEach((timer) => clearTimeout(timer));
		// this.pendingRemovals.delete(id);

		// Note: Graph clearing is now handled automatically by the visualization component
		// when it detects room state changes via the stateChanged event
		log('✅ Unsubscribed from room data');
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
