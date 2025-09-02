import { log, addEventListener, dispatchEvent } from '../lib/utils.js';
import { GunDBWrapper } from '../lib/gunWrapper.js';

// Data Synchronization between GunDB and UI
export class SyncService {
	constructor() {
		this.connection = null; // Will be set via setConnection()
		this.gunWrapper = null; // Will be initialized in setConnection()
		this.nodesChain = null;
		this.edgesChain = null;
		this.isSubscribed = false;
		this._isPaused = false; // Added for pausing/resuming
		this._propsLoadingFlag = false; // Added for props loading protection
		// this.pendingRemovals = new Map(); // COMMENTED OUT: Not using grace period logic anymore

		// Room state will be provided via events
		this._graphRoot = null;

		// Listen to room state changes to auto-subscribe
		this.setupRoomEventListeners();

		// Listen for props requests from UI/components
		this.setupPropsEventListeners();
	}

	setConnection(connection) {
		this.connection = connection;
		this.gunWrapper = new GunDBWrapper(connection);
	}

	// Event system now uses DOM events via dispatchEvent

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

	setupRoomEventListeners() {
		// Listen to room joined events to auto-subscribe
		addEventListener('room:joined', (event) => {
			const { room, graphRoot } = event.detail;
			this._graphRoot = graphRoot;

			if (graphRoot) {
				log('🔄 Room joined, auto-subscribing to sync');
				this.subscribeToRoom();
			}
		});

		// Listen to room left events to auto-unsubscribe
		addEventListener('room:left', (event) => {
			this._graphRoot = null;
			log('🔄 Room left, auto-unsubscribing from sync');
			this.unsubscribeFromRoom();
		});
	}

	/**
	 * Props requests: fetch props without involving controllers
	 */
	setupPropsEventListeners() {
		addEventListener('graph:requestProps', async (event) => {
			const { elementId, elementType, room } = event.detail || {};
			await this.handleRequestProps({ elementId, elementType, room });
		});
	}

	async handleRequestProps({ elementId, elementType, room } = {}) {
		if (!this.gunWrapper || !elementId || !elementType || !room) {
			return;
		}

		// Prevent sync noise during props read
		this.setPropsLoadingFlag(true);
		this.pauseDataSync();

		try {
			let props;
			try {
				if (elementType === 'node') {
					props = await this.gunWrapper.getNodeProps(room, elementId);
					// warm cache/full data if needed
					await this.gunWrapper.getNodeFullData(room, elementId);
				} else if (elementType === 'edge') {
					props = await this.gunWrapper.getEdgeProps(room, elementId);
				} else {
					throw new Error(`Unknown element type: ${elementType}`);
				}
			} catch (innerErr) {
				// Fallback to memory/local
				if (elementType === 'node') {
					props = await this.gunWrapper.getPropsFallback(
						room,
						elementId,
						true
					);
				} else if (elementType === 'edge') {
					props = await this.gunWrapper.getPropsFallback(
						room,
						elementId,
						false
					);
				}
			}

			dispatchEvent('graph:propsLoaded', {
				elementId,
				elementType,
				props,
				room,
			});
		} catch (error) {
			dispatchEvent('graph:propsLoaded', {
				elementId,
				elementType,
				props: {},
				room,
			});
		} finally {
			this.setPropsLoadingFlag(false);
			this.resumeDataSync();
		}
	}

	subscribeToRoom() {
		if (!this._graphRoot) {
			log('⚠️ Cannot subscribe: No graph root available');
			return false;
		}

		// Additional validation: ensure we have a valid graph root
		const graphRoot = this._graphRoot;

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

		// Dispatch event for UI to clear graph
		dispatchEvent('sync:clearGraph');

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
						// Dispatch removeNode event for proper cleanup
						dispatchEvent('sync:removeNode', { id });
						return;
					}

					// Check if data is actually empty (GunDB sometimes sends empty objects)
					if (Object.keys(data).length === 0) {
						log(
							`🗑️ Node ${shortId}... received empty data object - removing from graph`
						);
						// Dispatch removeNode event for proper cleanup
						dispatchEvent('sync:removeNode', { id });
						return;
					}

					// Use GunDBWrapper to clean the node data (same as old working system)
					const cleanData = this.gunWrapper.cleanNodeData(data);

					dispatchEvent('sync:addNode', { data: cleanData, id });
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
						// Dispatch removeEdge event for proper cleanup
						dispatchEvent('sync:removeEdge', { id });
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
						// Dispatch removeEdge event for proper cleanup
						dispatchEvent('sync:removeEdge', { id });
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
						dispatchEvent('sync:addEdge', { data: cleanData, id });
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
		if (!this._graphRoot) {
			log('⚠️ Cannot refresh: No graph root available');
			return false;
		}

		// Dispatch event for UI to clear graph
		dispatchEvent('sync:clearGraph');

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
			hasGraphRoot: !!this._graphRoot,
		};
	}
}
