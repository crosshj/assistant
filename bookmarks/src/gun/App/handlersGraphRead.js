import { log, dispatchEvent } from '../_lib/utils.js';

/**
 * Graph read handlers - handles all graph read operations (data requests and real-time sync)
 * Only dispatches events and interacts with appController.gun
 * Returns bound methods for AppController to use
 */
export function getHandlers(appController) {
	// Sync state kept in closure
	// Note: nodesChain, edgesChain, isSubscribed, _isPaused, _propsLoadingFlag are now managed by AppController
	// Note: gunWrapper is now appController.gun

	// Internal methods (not exported as events)
	function pauseDataSync() {
		appController._isPaused = true;
	}

	function resumeDataSync() {
		appController._isPaused = false;
	}

	function setPropsLoadingFlag(value) {
		appController._propsLoadingFlag = value;
	}

	function refreshData() {
		if (!appController.graphRoot) {
			log('⚠️ Cannot refresh: No graph root available');
			return false;
		}

		// Dispatch event for UI to clear graph
		dispatchEvent('sync:clearGraph');

		// Re-subscribe to get fresh data
		subscribeToRoom();

		log('🔄 Refreshing room data');
		return true;
	}

	function getSubscriptionStatus() {
		return {
			isSubscribed: appController.isSubscribed,
			hasNodesChain: !!appController.nodesChain,
			hasEdgesChain: !!appController.edgesChain,
			hasGraphRoot: !!appController.graphRoot,
		};
	}

	function subscribeToRoom() {
		if (!appController.graphRoot) {
			log('⚠️ Cannot subscribe: No graph root available');
			return false;
		}

		// Additional validation: ensure we have a valid graph root
		const graphRoot = appController.graphRoot;

		if (!graphRoot) {
			log('⚠️ Cannot subscribe: No graph root available');
			// Try again in a moment - room might not be fully ready yet
			setTimeout(() => {
				subscribeToRoom();
			}, 100);
			return false;
		}

		// Clear existing subscriptions
		unsubscribeFromRoom();

		// Dispatch event for UI to clear graph
		dispatchEvent('sync:clearGraph');

		try {
			// First, establish the subscription structure (but don't start syncing yet)
			appController.nodesChain = graphRoot.get('nodes').map();
			appController.edgesChain = graphRoot.get('edges').map();

			// Mark as subscribed BEFORE setting up the data handlers
			appController.isSubscribed = true;
			log('✅ Subscribed to room data');

			// Set up data handlers immediately
			setupDataHandlers();

			return true;
		} catch (error) {
			log('❌ Error setting up room subscriptions: ' + error.message);
			unsubscribeFromRoom();
			return false;
		}
	}

	function unsubscribeFromRoom() {
		if (appController.nodesChain) {
			appController.nodesChain.off();
			appController.nodesChain = null;
		}
		if (appController.edgesChain) {
			appController.edgesChain.off();
			appController.edgesChain = null;
		}
		appController.isSubscribed = false;
		appController._isPaused = false; // Reset paused state

		log('✅ Unsubscribed from room data');
	}

	function setupDataHandlers() {
		if (!appController.isSubscribed) return;

		log('🔄 Setting up data handlers for room data sync');

		try {
			// Subscribe to nodes
			appController.nodesChain.on((data, id) => {
				try {
					// Check if props loading is in progress - skip updates if so
					if (appController._propsLoadingFlag) {
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

					// Use GunDBWrapper to clean the node data
					const cleanData =
						appController.gun?.cleanNodeData(data) || data;

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
			appController.edgesChain.on((data, id) => {
				try {
					// Check if props loading is in progress - skip updates if so
					if (appController._propsLoadingFlag) {
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

						// Use GunDBWrapper to clean the edge data
						const cleanData =
							appController.gun?.cleanEdgeData(data) || data;

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

	return {
		async select(event) {
			const { elementId, elementType, room } = event.detail || {};

			// Validate required parameters
			if (!elementId || !elementType || !room) {
				dispatchEvent('graph:propsLoaded', {
					elementId,
					elementType,
					room,
					props: null,
					error: 'Invalid selection data',
				});
				return;
			}

			if (!appController.gun) {
				dispatchEvent('graph:propsLoaded', {
					elementId,
					elementType,
					room,
					props: null,
					error: 'Service not initialized',
				});
				return;
			}

			// Prevent sync noise during props read
			setPropsLoadingFlag(true);
			pauseDataSync();

			try {
				let props;
				try {
					if (elementType === 'node') {
						props = await appController.gun.getNodeProps(
							room,
							elementId
						);
						// warm cache/full data if needed
						await appController.gun.getNodeFullData(
							room,
							elementId
						);
					} else if (elementType === 'edge') {
						props = await appController.gun.getEdgeProps(
							room,
							elementId
						);
					} else {
						throw new Error(`Unknown element type: ${elementType}`);
					}
				} catch (innerErr) {
					dispatchEvent('graph:propsLoaded', {
						elementId,
						elementType,
						props: { error: 'Error fetching props' },
						error: 'Error fetching props',
					});
					return;
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
				setPropsLoadingFlag(false);
				resumeDataSync();
			}
		},

		subscribe(event) {
			// Called when room is ready (via callback from room.join)
			subscribeToRoom();
		},

		unsubscribe(event) {
			// Called before room cleanup (via callback from room.leave)
			unsubscribeFromRoom();
		},
	};
}
