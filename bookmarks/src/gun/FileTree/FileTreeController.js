import { log, addEventListener, dispatchEvent } from '../_lib/utils.js';
import { FileTree } from './FileTree.js';

/**
 * FileTreeController
 * Handles file tree events and coordinates with graph selection
 */
export class FileTreeController {
	constructor() {
		this.ui = new FileTree();
		this.currentRoom = null;

		// Bind controller methods
		this.handleSyncAddNode = this.handleSyncAddNode.bind(this);
		this.handleSyncRemoveNode = this.handleSyncRemoveNode.bind(this);
		this.handleSyncAddEdge = this.handleSyncAddEdge.bind(this);
		this.handleSyncRemoveEdge = this.handleSyncRemoveEdge.bind(this);
		this.handleSyncClearGraph = this.handleSyncClearGraph.bind(this);
		this.handleGraphSelect = this.handleGraphSelect.bind(this);
		this.handleRoomJoined = this.handleRoomJoined.bind(this);
		this.handleRoomLeft = this.handleRoomLeft.bind(this);

		// Setup event listeners
		this.setupEventListeners();
		this.setupUIEventDelegation();
	}

	setupEventListeners() {
		// Listen to sync events to maintain node and edge lists
		addEventListener('sync:addNode', this.handleSyncAddNode);
		addEventListener('sync:removeNode', this.handleSyncRemoveNode);
		addEventListener('sync:addEdge', this.handleSyncAddEdge);
		addEventListener('sync:removeEdge', this.handleSyncRemoveEdge);
		addEventListener('sync:clearGraph', this.handleSyncClearGraph);

		// Listen to room lifecycle events
		addEventListener('room:joined', this.handleRoomJoined);
		addEventListener('room:left', this.handleRoomLeft);

		// Listen to graph selection events to update UI selection
		addEventListener('graph:select', this.handleGraphSelect);
	}

	setupUIEventDelegation() {
		// Event delegation for item clicks (scoped to component DOM)
		this.ui.container.addEventListener('click', (e) => {
			const nodeElement = e.target.closest('[data-node-id]');
			if (nodeElement) {
				const nodeId = nodeElement.dataset.nodeId;
				if (nodeId) {
					this.handleNodeClick(nodeId);
				}
			}

			const edgeElement = e.target.closest('[data-edge-id]');
			if (edgeElement) {
				const edgeId = edgeElement.dataset.edgeId;
				if (edgeId) {
					this.handleEdgeClick(edgeId);
				}
			}
		});
	}

	handleSyncAddNode(event) {
		const { data, id } = event.detail;
		this.ui.addNode({ data, id });
	}

	handleSyncRemoveNode(event) {
		const { id } = event.detail;
		this.ui.removeNode(id);
	}

	handleSyncAddEdge(event) {
		const { data, id } = event.detail;
		this.ui.addEdge({ data, id });
	}

	handleSyncRemoveEdge(event) {
		const { id } = event.detail;
		this.ui.removeEdge(id);
	}

	handleSyncClearGraph() {
		this.ui.clearNodes();
	}

	handleGraphSelect(event) {
		const { elementId, elementType } = event.detail;

		if (elementType === 'node' && elementId) {
			this.ui.setSelectedNode(elementId);
		} else if (elementType === 'edge' && elementId) {
			this.ui.setSelectedEdge(elementId);
		} else {
			this.ui.setSelectedNode(null);
			this.ui.setSelectedEdge(null);
		}
	}

	handleRoomJoined(event) {
		const { room } = event.detail;
		this.currentRoom = room;
	}

	handleRoomLeft() {
		this.currentRoom = null;
		// Clear the file tree when leaving a room
		this.ui.clearNodes();
	}

	handleNodeClick(nodeId) {
		// Dispatch graph:select event to trigger the same behavior as graph selection
		dispatchEvent('graph:select', {
			elementId: nodeId,
			elementType: 'node',
			room: this.currentRoom,
		});
	}

	handleEdgeClick(edgeId) {
		// Dispatch graph:select event to trigger the same behavior as graph selection
		dispatchEvent('graph:select', {
			elementId: edgeId,
			elementType: 'edge',
			room: this.currentRoom,
		});
	}
}
