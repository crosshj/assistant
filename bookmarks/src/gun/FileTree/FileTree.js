import { html } from '../_lib/utils.js';
import './FileTree.css';

// Sort function for nodes and edges: items with labels first, then alphabetically
function sortByLabelThenId(a, b) {
	const aHasLabel = !!a.data?.label;
	const bHasLabel = !!b.data?.label;

	// Items with labels come first
	if (aHasLabel && !bHasLabel) return -1;
	if (!aHasLabel && bHasLabel) return 1;

	// Within each group, sort alphabetically
	const aLabel = a.data?.label || a.id;
	const bLabel = b.data?.label || b.id;
	return aLabel.localeCompare(bLabel);
}

// Check if an edge is orphaned (missing parent nodes)
function isEdgeOrphaned(edge, nodesMap) {
	const fromExists = nodesMap.has(edge.data?.from);
	const toExists = nodesMap.has(edge.data?.to);
	return !fromExists || !toExists;
}

export class FileTree {
	constructor() {
		this.container = null;
		this.nodes = new Map(); // Store nodes by ID
		this.edges = new Map(); // Store edges by ID
		this.selectedNodeId = null;
		this.selectedEdgeId = null;
		this.render();
	}

	render() {
		// Find the filetree container
		this.container = document.getElementById('filetree-container');
		if (!this.container) {
			throw new Error('FileTree container not found');
		}

		// Create filetree with nodes list
		this.updateDisplay();
	}

	addNode(nodeData) {
		const nodeId = nodeData.id;
		this.nodes.set(nodeId, nodeData);
		this.updateDisplay();
	}

	removeNode(nodeId) {
		this.nodes.delete(nodeId);
		if (this.selectedNodeId === nodeId) {
			this.selectedNodeId = null;
		}
		this.updateDisplay();
	}

	addEdge(edgeData) {
		const edgeId = edgeData.id;
		this.edges.set(edgeId, edgeData);
		this.updateDisplay();
	}

	removeEdge(edgeId) {
		this.edges.delete(edgeId);
		if (this.selectedEdgeId === edgeId) {
			this.selectedEdgeId = null;
		}
		this.updateDisplay();
	}

	clearNodes() {
		this.nodes.clear();
		this.edges.clear();
		this.selectedNodeId = null;
		this.selectedEdgeId = null;
		this.updateDisplay();
	}

	setSelectedNode(nodeId) {
		this.selectedNodeId = nodeId;
		this.selectedEdgeId = null; // Clear edge selection when selecting node
		this.updateDisplay();
	}

	setSelectedEdge(edgeId) {
		this.selectedEdgeId = edgeId;
		this.selectedNodeId = null; // Clear node selection when selecting edge
		this.updateDisplay();
	}

	updateDisplay() {
		if (!this.container) return;

		const nodesList = Array.from(this.nodes.values());
		const edgesList = Array.from(this.edges.values());

		// Annotate edges with orphan status
		edgesList.forEach((edge) => {
			edge.isOrphaned = isEdgeOrphaned(edge, this.nodes);
		});

		this.container.innerHTML = html`
			<div class="file-tree">
				<div class="file-tree-content">
					<div class="file-tree-section">
						<div class="section-header">Nodes</div>
						<div class="file-tree-list">
							${nodesList.length === 0
								? '<p class="no-items">No nodes yet</p>'
								: nodesList
										.sort(sortByLabelThenId)
										.map((node) => this.renderNode(node))
										.join('')}
						</div>
					</div>
					<div class="file-tree-section">
						<div class="section-header">Edges</div>
						<div class="file-tree-list">
							${edgesList.length === 0
								? '<p class="no-items">No edges yet</p>'
								: edgesList
										.sort(sortByLabelThenId)
										.map((edge) => this.renderEdge(edge))
										.join('')}
						</div>
					</div>
				</div>
			</div>
		`;
	}

	renderNode(node) {
		const nodeId = node.id;
		const isSelected = this.selectedNodeId === nodeId;
		const label = node.data?.label || 'N/A';

		return html`
			<div
				class="file-tree-item ${isSelected ? 'selected' : ''}"
				data-node-id="${nodeId}"
			>
				<span class="item-icon">📄</span>
				<span class="item-label">${label}</span>
				<span></span>
				<span class="item-id">${nodeId}</span>
			</div>
		`;
	}

	renderEdge(edge) {
		const edgeId = edge.id;
		const isSelected = this.selectedEdgeId === edgeId;
		const label = edge.data?.label || 'N/A';
		const isOrphaned = edge.isOrphaned;

		return html`
			<div
				class="file-tree-item ${isSelected ? 'selected' : ''}"
				data-edge-id="${edgeId}"
			>
				<span class="item-icon">🔗</span>
				<span class="item-label">${label}</span>
				<span class="item-orphan">${isOrphaned ? 'orphan' : ''}</span>
				<span class="item-id">${edgeId}</span>
			</div>
		`;
	}
}
