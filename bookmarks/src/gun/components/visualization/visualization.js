import cytoscape from 'cytoscape';
import { log, $ } from '../../utils/utils.js';

// Cytoscape Visualization Management
export class GraphVisualization {
	constructor() {
		this.cy = null;
		this.layoutTimeout = null;
		this.initialized = false;
		this.isLayoutRunning = false;
	}

	init(containerId) {
		if (this.initialized) return this.cy;

		// Check if all required modules are loaded
		if (typeof cytoscape === 'undefined') {
			log('Error: Cytoscape module not loaded');
			return null;
		}

		// Initialize Cytoscape after DOM is loaded
		this.cy = cytoscape({
			container: $(containerId),
			style: [
				{
					selector: 'node',
					style: {
						'background-color': '#3fb950',
						label: 'data(label)',
						color: '#e6edf3',
						'text-outline-width': 1,
						'text-outline-color': '#0b0d10',
						'font-size': 11,
						// Add size constraints
						width: 60,
						height: 60,
						'text-wrap': 'wrap',
						'text-max-width': 50,
						'text-valign': 'center',
						'text-halign': 'center',
						// Additional styling for better appearance
						padding: 5,
						shape: 'ellipse',
					},
				},
				{
					selector: 'node:selected',
					style: {
						'background-color': '#f78166',
						'border-color': '#f0f6fc',
						'border-width': 3,
						'border-opacity': 1,
						'text-outline-width': 2,
						'text-outline-color': '#0b0d10',
						// Keep same size constraints for selected nodes
						width: 60,
						height: 60,
						'text-wrap': 'wrap',
						'text-max-width': 50,
						'text-valign': 'center',
						'text-halign': 'center',
						// Additional styling for selected state
						padding: 5,
						shape: 'ellipse',
					},
				},
				{
					selector: 'edge',
					style: {
						'line-color': '#58a6ff',
						'target-arrow-color': '#58a6ff',
						'target-arrow-shape': 'triangle',
						'curve-style': 'bezier',
						width: 2,
						label: 'data(label)',
						'font-size': 10,
						color: '#9fb3c8',
					},
				},
				{
					selector: 'edge:selected',
					style: {
						'line-color': '#f78166',
						'target-arrow-color': '#f78166',
						width: 4,
						'text-outline-width': 2,
						'text-outline-color': '#0b0d10',
					},
				},
			],
			layout: { name: 'cose', animate: false },
			// Add default zoom and pan settings
			minZoom: 0.1,
			maxZoom: 3,
			zoom: 1,
			pan: { x: 0, y: 0 },
		});

		this.setupEventHandlers();
		this.setupKeyboardShortcuts();
		this.setupSearchFunctionality();
		this.setupLayoutControls();

		// Fit the graph to a reasonable view after initialization
		setTimeout(() => {
			this.fitGraphToView();
		}, 100);

		this.initialized = true;
		log('Cytoscape visualization initialized');

		return this.cy;
	}

	setupEventHandlers() {
		if (!this.cy) return;

		// Cytoscape event handlers - simple and direct
		this.cy.on('select', 'node,edge', (e) => {
			this.handleSelection(e);
		});

		// Add double-click to center on node
		this.cy.on('dblclick', 'node', (e) => {
			this.cy.center(e.target);
			this.cy.fit(e.target, 50);
		});

		// Listen for room state changes to auto-clear graph
		this.setupRoomStateListener();
	}

	/**
	 * Listen for room state changes and automatically clear graph when room is left
	 */
	setupRoomStateListener() {
		// Listen for state changes from the state manager
		document.addEventListener('stateChanged', (e) => {
			const state = e.detail;

			if (state.room.status === 'not_joined') {
				this.clearGraph();
			}
		});

		// Also listen for custom room leave events as a backup
		document.addEventListener('ui:leaveRoom', () => {
			this.clearGraph();
		});
	}

	// Separate method to handle selection with proper error handling
	handleSelection(e) {
		try {
			const d = e.target.data();
			if (!d || !d.id) {
				return;
			}

			// Update the UI display with basic data
			if (e.target.isNode && e.target.isNode()) {
				// Update form fields (but NOT the props field - wait for props to load)
				const nodeIdField = $('nodeId');
				const nodeLabelField = $('nodeLabel');

				if (nodeIdField) nodeIdField.value = d.nid || '';
				if (nodeLabelField) nodeLabelField.value = d.label || '';

				// DO NOT update nodeProps field here - wait for props to load via event system
				// This prevents showing stale/incomplete data

				// Emit selection changed event for auto-loading props
				console.log(
					'🔍 Visualization: Emitting selectionChanged event for node:',
					d.nid || d.id,
					'room:',
					window.currentRoom
				);
				document.dispatchEvent(
					new CustomEvent('selectionChanged', {
						detail: {
							elementId: d.nid || d.id,
							elementType: 'node',
							room: window.currentRoom,
						},
					})
				);
			}
			if (e.target.isEdge && e.target.isEdge()) {
				// Update form fields (but NOT the props field - wait for props to load)
				$('edgeId').value = d.eid || '';
				$('edgeFrom').value = d.source?.replace('n_', '') || '';
				$('edgeTo').value = d.target?.replace('n_', '') || '';
				$('edgeLabel').value = d.label || '';

				// DO NOT update edgeProps field here - wait for props to load via event system
				// This prevents showing stale/incomplete data

				// Emit selection changed event for auto-loading props
				document.dispatchEvent(
					new CustomEvent('selectionChanged', {
						detail: {
							elementId: d.eid || d.id,
							elementType: 'edge',
							room: window.currentRoom,
						},
					})
				);
			}

			// Visualization component should NOT trigger props loading
			// Props loading should be handled by other components that need the data
			// This keeps Cytoscape focused only on graph display
		} catch (error) {
			// Silently handle selection errors to avoid console noise
		}
	}

	setupKeyboardShortcuts() {
		document.addEventListener('keydown', (e) => {
			if (e.ctrlKey || e.metaKey) {
				switch (e.key) {
					case 's':
						e.preventDefault();
						$('exportBtn').click();
						break;
					case 'z':
						e.preventDefault();
						if (e.shiftKey) {
							// Ctrl+Shift+Z for redo (if needed)
						} else {
							// Ctrl+Z for undo (if needed)
						}
						break;
				}
			}
		});
	}

	setupSearchFunctionality() {
		$('searchNode').addEventListener('input', (e) => {
			const searchTerm = e.target.value.toLowerCase();
			if (searchTerm === '') {
				this.cy.elements().removeClass('search-highlight');
				return;
			}

			this.cy.elements().removeClass('search-highlight');
			this.cy.nodes().forEach((node) => {
				const label = node.data('label') || '';
				const props = JSON.stringify(node.data('props') || {});
				if (
					label.toLowerCase().includes(searchTerm) ||
					props.toLowerCase().includes(searchTerm)
				) {
					node.addClass('search-highlight');
				}
			});
		});

		$('clearSearch').addEventListener('click', () => {
			$('searchNode').value = '';
			this.cy.elements().removeClass('search-highlight');
		});
	}

	setupLayoutControls() {
		$('layoutSelect').addEventListener('change', (e) => {
			const layout = e.target.value;
			this.cy.layout({ name: layout, animate: true }).run();
		});

		$('fitGraph').addEventListener('click', () => {
			this.cy.fit();
			this.cy.center();
		});
	}

	clearGraph() {
		if (this.cy) {
			this.cy.elements().remove();
		}
	}

	// Fit graph to a reasonable view with padding
	fitGraphToView() {
		if (!this.cy || this.cy.elements().length === 0) return;

		// Fit with some padding around the elements
		this.cy.fit(null, 50);

		// Ensure zoom is within reasonable bounds
		const currentZoom = this.cy.zoom();
		if (currentZoom > 2) {
			this.cy.zoom(2);
		} else if (currentZoom < 0.3) {
			this.cy.zoom(0.3);
		}
	}

	addNode(nodeData) {
		if (!this.cy) return;

		const exists = this.cy.getElementById('n_' + nodeData.id);
		if (!exists.empty()) exists.remove();

		this.cy.add({
			group: 'nodes',
			data: {
				id: 'n_' + nodeData.id,
				nid: nodeData.id,
				label: nodeData.label || nodeData.id,
				props: nodeData.props || {},
				by: nodeData.by || 'anon',
				updatedAt: nodeData.updatedAt || 0,
			},
		});

		this.debounceLayout();

		// Fit to view after adding node to maintain reasonable zoom
		setTimeout(() => {
			this.fitGraphToView();
		}, 100);
	}

	removeNode(nodeId) {
		if (!this.cy) return;

		const ele = this.cy.getElementById('n_' + nodeId);
		if (!ele.empty()) {
			ele.remove();
			log('🗑️ Node removed: ' + nodeId);
		}
	}

	addEdge(edgeData) {
		if (!this.cy) return;

		const exists = this.cy.getElementById('e_' + edgeData.id);
		if (!exists.empty()) exists.remove();

		this.cy.add({
			group: 'edges',
			data: {
				id: 'e_' + edgeData.id,
				eid: edgeData.id,
				source: 'n_' + edgeData.from,
				target: 'n_' + edgeData.to,
				label: edgeData.label || '',
				props: edgeData.props || {},
				by: edgeData.by || 'anon',
				updatedAt: edgeData.updatedAt || 0,
			},
		});

		this.debounceLayout();

		// Fit to view after adding edge to maintain reasonable zoom
		setTimeout(() => {
			this.fitGraphToView();
		}, 100);
	}

	removeEdge(edgeId) {
		if (!this.cy) return;

		const ele = this.cy.getElementById('e_' + edgeId);
		if (!ele.empty()) {
			ele.remove();
			log('🗑️ Edge removed: ' + edgeId);
		}
	}

	debounceLayout() {
		// Prevent multiple layouts from running simultaneously
		if (this.isLayoutRunning) {
			clearTimeout(this.layoutTimeout);
			this.layoutTimeout = setTimeout(() => this.debounceLayout(), 200);
			return;
		}

		clearTimeout(this.layoutTimeout);
		this.layoutTimeout = setTimeout(() => {
			try {
				this.isLayoutRunning = true;
				this.cy.layout({ name: 'cose', animate: false }).run();

				// Reset layout flag after a delay to allow layout to complete
				setTimeout(() => {
					this.isLayoutRunning = false;
				}, 500);
			} catch (e) {
				log('⚠️ Layout error: ' + e.message);
				this.isLayoutRunning = false;
			}
		}, 100);
	}

	getCytoscape() {
		return this.cy;
	}

	isInitialized() {
		return this.initialized;
	}
}
