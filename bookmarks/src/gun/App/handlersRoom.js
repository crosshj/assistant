import { log, dispatchEvent, generateId } from '../_lib/utils.js';

/**
 * Room handlers - handles all room-related events
 * Only dispatches events and interacts with appController.gun
 * Returns bound methods for AppController to use
 */
export function getHandlers(appController) {
	// Room state kept in closure
	// Note: nodesChain and edgesChain are now managed by AppController

	return {
		async join(event, onRoomReady) {
			const room = event.detail;
			if (!room) return false;

			// 1. START joining - UI can show joining state
			dispatchEvent('room:joining', { room });

			// Set current room and get graph root
			appController.currentRoom = room;
			appController.graphRoot = appController.gun.getGraphRoot(room);

			// Return a promise that resolves when room is ready
			return new Promise((resolve) => {
				let joinCompleted = false;

				// Gun.js operations are asynchronous, so we need to wait for the operation to complete
				// before marking the room as joined
				appController.graphRoot.once((data, ack) => {
					if (!joinCompleted) {
						joinCompleted = true;

						// Room is fully ready - fire joined event for UI components
						dispatchEvent('room:joined', {
							room,
							graphRoot: appController.graphRoot,
						});

						// Call the callback if provided (e.g., sync subscription)
						if (onRoomReady) {
							onRoomReady(event);
						}

						resolve(true);
					}
				});

				// Fallback: If Gun.js callback doesn't fire within 1 second, assume the room is accessible
				// This handles cases where the room might be empty or the callback doesn't fire
				setTimeout(() => {
					if (
						!joinCompleted &&
						appController.currentRoom === room &&
						appController.graphRoot
					) {
						joinCompleted = true;

						// Room is fully ready - fire joined event for UI components
						dispatchEvent('room:joined', {
							room,
							graphRoot: appController.graphRoot,
						});

						// Call the callback if provided (e.g., sync subscription)
						if (onRoomReady) {
							onRoomReady(event);
						}

						resolve(true);
					} else if (joinCompleted) {
						// Timeout fallback skipped - callback already fired
					}
				}, 1000);
			});
		},

		async leave(event, onBeforeLeave) {
			const roomToLeave = appController.currentRoom;

			// 1. START leaving - UI can show leaving state
			dispatchEvent('room:leaving', { room: roomToLeave });

			// Call the callback if provided (e.g., sync unsubscription)
			if (onBeforeLeave) {
				onBeforeLeave(event);
			}

			// Clear room state (sync cleanup is handled by the callback)
			appController.currentRoom = null;
			appController.graphRoot = null;

			// 2. FULLY left - All cleanup complete - fire left event for UI components
			dispatchEvent('room:left', {
				room: null,
				graphRoot: null,
			});

			return true;
		},

		export(event) {
			const { room } = event.detail;
			if (!room) return null;

			const nodes = {};
			const edges = {};

			return new Promise((resolve) => {
				const graphRoot = appController.gun.getGraphRoot(room);
				const nodesChain = appController.gun.getNodesChain(room).map();
				const edgesChain = appController.gun.getEdgesChain(room).map();

				let nodeCount = 0;
				let edgeCount = 0;

				nodesChain.on((data, id) => {
					if (data) {
						nodes[id] = data;
						nodeCount++;
					}
				});

				edgesChain.on((data, id) => {
					if (data) {
						edges[id] = data;
						edgeCount++;
					}
				});

				// Wait a bit for data to load, then resolve
				setTimeout(() => {
					log(
						`Exporting ${nodeCount} nodes and ${edgeCount} edges from room: ${room}`
					);
					const exportData = {
						room,
						nodes,
						edges,
						metadata: {
							exportedAt: new Date().toISOString(),
							nodeCount,
							edgeCount,
						},
					};

					// Dispatch result back to UI
					dispatchEvent('room:exportCompleted', {
						room,
						data: exportData,
					});
					resolve(exportData);
				}, 1000);
			});
		},

		import(event) {
			const { room, data } = event.detail;

			if (!appController.currentRoom) {
				log('join a room first');
				dispatchEvent('room:importCompleted', { room, success: false });
				return false;
			}

			if (!data || !data.nodes || !data.edges) {
				log('invalid import data');
				dispatchEvent('room:importCompleted', { room, success: false });
				return false;
			}

			// Import nodes
			for (const n of data.nodes || []) {
				appController.graphRoot
					.get('nodes')
					.get(n.id || generateId())
					.put(n);
			}

			// Import edges
			for (const e of data.edges || []) {
				appController.graphRoot
					.get('edges')
					.get(e.id || generateId())
					.put(e);
			}

			log('imported data');
			dispatchEvent('room:importCompleted', { room, success: true });
			return true;
		},
	};
}
