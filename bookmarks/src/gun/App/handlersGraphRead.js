import { log, dispatchEvent } from '../_lib/utils.js';
import { cleanNodeData, cleanEdgeData } from '../_lib/gun.utils.js';

/**
 * Graph read handlers - handles all graph read operations (data requests and real-time sync)
 * Only dispatches events and interacts with appController.gun
 * Returns bound methods for AppController to use
 */
export function getHandlers(appController) {
	// Sync state kept in closure

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
			// subscribe to nodes and edges
			appController.isSubscribed = true;
			appController.nodesChain = graphRoot.get('nodes').map();
			appController.edgesChain = graphRoot.get('edges').map();
			appController.nodesChain.on(handleNodeUpdate);
			appController.edgesChain.on(handleEdgeUpdate);
			log('✅ Subscribed to room data');
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

	function handleNodeUpdate(data, id) {
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

			// Use utility function to clean the node data
			const cleanData = cleanNodeData(data) || data;

			dispatchEvent('sync:addNode', { data: cleanData, id });
		} catch (error) {
			const shortId = id.slice(0, 8);
			log(
				'❌ Error syncing node: ' +
					error.message +
					` (ID: ${shortId}...)`
			);
		}
	}

	function handleEdgeUpdate(data, id) {
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

				// Use utility function to clean the edge data
				const cleanData = cleanEdgeData(data) || data;

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
	}

	async function select(event) {
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
	}
	return {
		subscribe: subscribeToRoom,
		unsubscribe: unsubscribeFromRoom,
		select,
	};
}
