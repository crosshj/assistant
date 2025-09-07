import cytoscape from 'cytoscape';
import { log, $ } from './utils.js';

// Cytoscape Visualization Management
export class GraphVisualization {
	constructor(currentRoom = null) {
		this.currentRoom = currentRoom;
		this.cy = null;
		this.layoutTimeout = null;
		this.initialized = false;
		this.isLayoutRunning = false;
		this.selectionOrder = []; // Track the order nodes were selected
	}

	init(containerId) {
		if (this.initialized) {
			return this.cy;
		}

		// Check if all required modules are loaded
		if (typeof cytoscape === 'undefined') {
			log('Error: Cytoscape module not loaded');
			return null;
		}

		// Check if container exists
		const container = $(containerId);
		if (!container) {
			log(`Error: Container '${containerId}' not found`);
			return null;
		}

		try {
			// Initialize Cytoscape after DOM is loaded
			const containerElement = $(containerId);

			this.cy = cytoscape({
				container: containerElement,
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
						selector: 'node[isPlaceholder = "true"]',
						style: {
							'background-color': '#6e7781',
							'border-color': '#d0d7de',
							'border-width': 2,
							'border-style': 'dashed',
							'border-opacity': 0.8,
							color: '#656d76',
							'font-style': 'italic',
							// Keep same size constraints
							width: 60,
							height: 60,
							'text-wrap': 'wrap',
							'text-max-width': 50,
							'text-valign': 'center',
							'text-halign': 'center',
							padding: 5,
							shape: 'ellipse',
						},
					},
					{
						selector: 'edge',
						style: {
							'line-color': '#58a6ff',
							'target-arrow-color': '#58a6ff',
							'target-arrow-shape': 'data(targetArrow)',
							'source-arrow-color': '#58a6ff',
							'source-arrow-shape': 'data(sourceArrow)',
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
							'source-arrow-color': '#f78166',
							width: 4,
							'text-outline-width': 2,
							'text-outline-color': '#0b0d10',
						},
					},
				],
				layout: { name: 'circle', animate: false, padding: 100 },
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
			// log('Cytoscape visualization initialized');

			return this.cy;
		} catch (error) {
			console.error(
				'CytoscapeWrapper: Error during initialization:',
				error
			);
			log('Error: Failed to initialize Cytoscape: ' + error.message);
			return null;
		}
	}

	setupEventHandlers() {
		if (!this.cy) return;

		// Cytoscape event handlers - simple and direct
		this.cy.on('select', 'node,edge', (e) => {
			this.handleSelection(e);
		});

		// Handle background tap to clear selection
		this.cy.on('tap', (e) => {
			// If nothing is selected (background tap), clear edit forms
			if (e.target === this.cy) {
				this.handleClearSelection();
			}
		});

		// Handle deselection to clear selection order
		this.cy.on('unselect', 'node', () => {
			// Clear selection order when nodes are deselected
			this.selectionOrder = [];
			// Check if nothing is selected and clear forms
			if (this.cy.elements(':selected').length === 0) {
				this.handleClearSelection();
			}
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
		// Listen for room lifecycle events directly from RoomManager
		document.addEventListener('room:left', () => {
			this.clearGraph();
		});

		// Also listen for custom room leave events as a backup
		document.addEventListener('ui:leaveRoom', () => {
			this.clearGraph();
		});

		// Listen for layout change events
		document.addEventListener('graph:layoutChange', (event) => {
			if (this.cy && this.cy.elements().length > 0) {
				const layout = event.detail.layout;
				const layoutOptions = { name: layout, animate: true };

				// Add padding for specific layouts
				if (layout === 'circle') {
					layoutOptions.padding = 100;
				} else if (layout === 'cose') {
					layoutOptions.padding = 150;
				}

				this.cy.layout(layoutOptions).run();
			}
		});
	}

	// Handle clearing selection and edit forms
	handleClearSelection() {
		// Clear all form fields (defensive - only if they exist)
		this.clearNewNodeForm();
		this.clearEdgeForm();

		// Clear edit form fields (defensive - only if they exist)
		const nodeIdField = $('nodeId');
		const nodeLabelField = $('nodeLabel');
		const edgeIdField = $('edgeId');
		const edgeFromField = $('edgeFrom');
		const edgeToField = $('edgeTo');
		const edgeLabelField = $('edgeLabel');

		if (nodeIdField) nodeIdField.value = '';
		if (nodeLabelField) nodeLabelField.value = '';
		if (edgeIdField) edgeIdField.value = '';
		if (edgeFromField) edgeFromField.value = '';
		if (edgeToField) edgeToField.value = '';
		if (edgeLabelField) edgeLabelField.value = '';

		// Dispatch clear selection event
		document.dispatchEvent(
			new CustomEvent('graph:select', {
				detail: {
					elementId: null,
					elementType: null,
					room: this.currentRoom,
				},
			})
		);
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
				// Track selection order for this node
				const nodeId = d.nid || d.id;
				if (!this.selectionOrder.includes(nodeId)) {
					this.selectionOrder.push(nodeId);
				}

				// Clear the new node form when nodes are selected
				this.clearNewNodeForm();

				// Clear the edge form when single nodes are selected (unless we're about to create an edge)
				if (this.selectionOrder.length === 1) {
					this.clearEdgeForm();
				}

				// Update form fields only for single node selection (defensive - only if they exist)
				if (this.selectionOrder.length === 1) {
					const nodeIdField = $('nodeId');
					const nodeLabelField = $('nodeLabel');

					if (nodeIdField) nodeIdField.value = d.nid || '';
					if (nodeLabelField) nodeLabelField.value = d.label || '';

					// DO NOT update nodeProps field here - wait for props to load via event system
					// This prevents showing stale/incomplete data

					// Emit selection changed event for auto-loading props
					document.dispatchEvent(
						new CustomEvent('graph:select', {
							detail: {
								elementId: d.nid || d.id,
								elementType: 'node',
								room: this.currentRoom,
							},
						})
					);
				}

				// Check if we now have two nodes selected for edge creation
				this.checkForEdgeCreation();
			}
			if (e.target.isEdge && e.target.isEdge()) {
				// Clear selection order when edge is selected
				this.selectionOrder = [];

				// Clear the new node form when edges are selected
				this.clearNewNodeForm();

				// Update form fields (defensive - only if they exist)
				const edgeIdField = $('edgeId');
				const edgeFromField = $('edgeFrom');
				const edgeToField = $('edgeTo');
				const edgeLabelField = $('edgeLabel');

				if (edgeIdField) edgeIdField.value = d.eid || '';
				if (edgeFromField)
					edgeFromField.value = d.source?.replace('n_', '') || '';
				if (edgeToField)
					edgeToField.value = d.target?.replace('n_', '') || '';
				if (edgeLabelField) edgeLabelField.value = d.label || '';

				// DO NOT update edgeProps field here - wait for props to load via event system
				// This prevents showing stale/incomplete data

				// Emit selection changed event for auto-loading props
				document.dispatchEvent(
					new CustomEvent('graph:select', {
						detail: {
							elementId: d.eid || d.id,
							elementType: 'edge',
							room: this.currentRoom,
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

	// Clear the new node form when nodes/edges are selected
	clearNewNodeForm() {
		const nodeIdField = $('nodeId');
		const nodeLabelField = $('nodeLabel');
		const nodePropsField = $('nodeProps');

		// Clear the new node form fields
		if (nodeIdField) nodeIdField.value = '';
		if (nodeLabelField) nodeLabelField.value = '';
		if (nodePropsField) nodePropsField.value = '';
	}

	// Clear the edge form when single nodes are selected
	clearEdgeForm() {
		const edgeIdField = $('edgeId');
		const edgeFromField = $('edgeFrom');
		const edgeToField = $('edgeTo');
		const edgeLabelField = $('edgeLabel');
		const edgeDirectionField = $('edgeDirection');
		const edgePropsField = $('edgeProps');

		// Clear the edge form fields
		if (edgeIdField) edgeIdField.value = '';
		if (edgeFromField) edgeFromField.value = '';
		if (edgeToField) edgeToField.value = '';
		if (edgeLabelField) edgeLabelField.value = '';
		if (edgeDirectionField) edgeDirectionField.value = 'both'; // Reset to default
		if (edgePropsField) edgePropsField.value = '';
	}

	// Check if two nodes are selected and populate edge creation form
	checkForEdgeCreation() {
		const selectedNodes = this.cy.nodes(':selected');

		if (selectedNodes.length === 2 && this.selectionOrder.length >= 2) {
			// Use selection order to determine edge direction
			const firstSelectedId = this.selectionOrder[0];
			const secondSelectedId = this.selectionOrder[1];

			// Find the actual node objects
			const node1 = selectedNodes.filter((node) => {
				const nodeId = node.data('nid') || node.id().replace('n_', '');
				return nodeId === firstSelectedId;
			})[0];
			const node2 = selectedNodes.filter((node) => {
				const nodeId = node.data('nid') || node.id().replace('n_', '');
				return nodeId === secondSelectedId;
			})[0];

			if (node1 && node2) {
				// Check if an edge already exists between these nodes
				const existingEdge = this.cy.edges().filter((edge) => {
					const source = edge.source().id().replace('n_', '');
					const target = edge.target().id().replace('n_', '');
					// Check for edges in both directions
					return (
						(source === firstSelectedId &&
							target === secondSelectedId) ||
						(source === secondSelectedId &&
							target === firstSelectedId)
					);
				});

				if (existingEdge.length === 0) {
					// No edge exists, populate the edge creation form with default direction
					const edgeFromField = $('edgeFrom');
					const edgeToField = $('edgeTo');
					const edgeDirectionField = $('edgeDirection');

					if (edgeFromField && edgeToField) {
						edgeFromField.value = firstSelectedId; // First selected = FROM
						edgeToField.value = secondSelectedId; // Second selected = TO

						// Set direction to 'both' by default
						if (edgeDirectionField) {
							edgeDirectionField.value = 'both';
						}

						// Focus on the edge label field for convenience
						const edgeLabelField = $('edgeLabel');
						if (edgeLabelField) {
							edgeLabelField.focus();
						}
					}
				} else {
					// Edge exists, populate form with existing edge data and set direction
					const existingEdgeData = existingEdge[0].data();
					const edgeFromField = $('edgeFrom');
					const edgeToField = $('edgeTo');
					const edgeDirectionField = $('edgeDirection');
					const edgeLabelField = $('edgeLabel');
					const edgePropsField = $('edgeProps');

					if (edgeFromField && edgeToField) {
						// Determine the actual direction based on existing edge
						const source = existingEdgeData.source;
						const target = existingEdgeData.target;
						const edgeDirection =
							existingEdgeData.direction || 'both';

						// Set the form fields to match the existing edge
						edgeFromField.value = source;
						edgeToField.value = target;

						// Set the direction dropdown to match existing edge
						if (edgeDirectionField) {
							edgeDirectionField.value = edgeDirection;
						}

						// Set label if it exists
						if (edgeLabelField && existingEdgeData.label) {
							edgeLabelField.value = existingEdgeData.label;
						}

						// Set props if they exist
						if (edgePropsField && existingEdgeData.props) {
							try {
								edgePropsField.value = JSON.stringify(
									existingEdgeData.props,
									null,
									2
								);
							} catch (e) {
								edgePropsField.value = '{}';
							}
						}
					}
				}
			}
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
		const searchInput = $('searchNode');
		const clearButton = $('clearSearch');

		if (searchInput) {
			searchInput.addEventListener('input', (e) => {
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
		}

		if (clearButton) {
			clearButton.addEventListener('click', () => {
				if (searchInput) searchInput.value = '';
				this.cy.elements().removeClass('search-highlight');
			});
		}
	}

	setupLayoutControls() {
		const layoutSelect = $('layoutSelect');
		const fitButton = $('fitGraph');

		if (layoutSelect) {
			layoutSelect.addEventListener('change', (e) => {
				const layout = e.target.value;
				this.cy.layout({ name: layout, animate: true }).run();
			});
		}

		if (fitButton) {
			fitButton.addEventListener('click', () => {
				this.cy.fit();
				this.cy.center();
			});
		}
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

		const nodeId = 'n_' + nodeData.id;
		const exists = this.cy.getElementById(nodeId);

		// If there's a placeholder node, remove it first
		if (!exists.empty()) {
			exists.remove();
		}

		// Add the real node
		this.cy.add({
			group: 'nodes',
			data: {
				id: nodeId,
				nid: nodeData.id,
				label: nodeData.label || nodeData.id,
				props: nodeData.props || {},
				by: nodeData.by || 'anon',
				updatedAt: nodeData.updatedAt || 0,
				isPlaceholder: false, // Mark as real node
			},
		});

		// Simple layout update - no complex debouncing needed
		this.updateLayout();
	}

	removeNode(nodeId) {
		if (!this.cy) return;

		const ele = this.cy.getElementById('n_' + nodeId);
		if (!ele.empty()) {
			ele.remove();
			log('🗑️ Node removed: ' + nodeId);
		}
	}

	selectElement(elementId, elementType) {
		if (!this.cy) return;

		// Clear current selection
		this.cy.elements().unselect();

		if (!elementId || !elementType) return;

		// Select the element based on type
		if (elementType === 'node') {
			const cyNodeId = 'n_' + elementId;
			const node = this.cy.getElementById(cyNodeId);
			if (!node.empty()) {
				node.select();
			}
		} else if (elementType === 'edge') {
			const cyEdgeId = 'e_' + elementId;
			const edge = this.cy.getElementById(cyEdgeId);
			if (!edge.empty()) {
				edge.select();
			}
		}
	}

	addEdge(edgeData) {
		if (!this.cy) return;

		const edgeId = 'e_' + edgeData.id;
		const sourceId = 'n_' + edgeData.from;
		const targetId = 'n_' + edgeData.to;

		// Remove existing edge if it exists
		const exists = this.cy.getElementById(edgeId);
		if (!exists.empty()) exists.remove();

		// Check if source and target nodes exist, create placeholders if they don't

		if (this.cy.getElementById(sourceId).empty()) {
			this.cy.add({
				group: 'nodes',
				data: {
					id: sourceId,
					nid: edgeData.from,
					label: `[${edgeData.from.slice(0, 8)}...]`,
					props: {},
					by: 'placeholder',
					updatedAt: Date.now(),
					isPlaceholder: true, // Mark as placeholder for styling
				},
			});
		}

		// Create placeholder target node if it doesn't exist
		if (this.cy.getElementById(targetId).empty()) {
			this.cy.add({
				group: 'nodes',
				data: {
					id: targetId,
					nid: edgeData.to,
					label: `[${edgeData.to.slice(0, 8)}...]`,
					props: {},
					by: 'placeholder',
					updatedAt: Date.now(),
					isPlaceholder: true, // Mark as placeholder for styling
				},
			});
		}

		// Determine arrow configuration based on direction property
		const direction = edgeData.direction || 'both'; // 'forward', 'reverse', 'both' - default to 'both'
		let sourceArrow = 'none';
		let targetArrow = 'triangle';

		switch (direction) {
			case 'reverse':
				sourceArrow = 'triangle';
				targetArrow = 'none';
				break;
			case 'both':
				sourceArrow = 'triangle';
				targetArrow = 'triangle';
				break;
			case 'forward':
			default:
				sourceArrow = 'none';
				targetArrow = 'triangle';
				break;
		}

		// Add the edge
		this.cy.add({
			group: 'edges',
			data: {
				id: edgeId,
				eid: edgeData.id,
				source: sourceId,
				target: targetId,
				label: edgeData.label || '',
				props: edgeData.props || {},
				by: edgeData.by || 'anon',
				updatedAt: edgeData.updatedAt || 0,
				direction: direction,
				sourceArrow: sourceArrow,
				targetArrow: targetArrow,
			},
		});

		// Simple layout update - no complex debouncing needed
		this.updateLayout();
	}

	removeEdge(edgeId) {
		if (!this.cy) return;

		const ele = this.cy.getElementById('e_' + edgeId);
		if (!ele.empty()) {
			ele.remove();
			log('🗑️ Edge removed: ' + edgeId);
		}
	}

	updateLayout() {
		if (!this.cy || !this.cy.container()) {
			return;
		}

		const container = this.cy.container();

		if (!container) {
			return;
		}

		// Check if container has dimensions
		const width =
			container.offsetWidth ||
			container.clientWidth ||
			container.getBoundingClientRect?.()?.width;
		const height =
			container.offsetHeight ||
			container.clientHeight ||
			container.getBoundingClientRect?.()?.height;

		if (!width || !height || width === 0 || height === 0) {
			// Container not ready, skip layout for now
			return;
		}

		// Only run layout if there are elements
		if (this.cy.elements().length === 0) {
			return;
		}

		// Circle layout - default and most organized
		try {
			this.cy
				.layout({ name: 'circle', animate: false, padding: 100 })
				.run();
		} catch (e) {
			log('⚠️ Circle layout failed: ' + e.message);
		}
	}

	debounceLayout() {
		// Prevent multiple layouts from running simultaneously
		if (this.isLayoutRunning) {
			return;
		}

		clearTimeout(this.layoutTimeout);
		this.layoutTimeout = setTimeout(() => {
			try {
				this.isLayoutRunning = true;
				this.cy
					.layout({ name: 'circle', animate: false, padding: 100 })
					.run();
				this.isLayoutRunning = false;
			} catch (e) {
				log('⚠️ Layout error: ' + e.message);
				this.isLayoutRunning = false;
			}
		}, 100);
	}

	resize() {
		if (!this.cy) return;

		try {
			this.cy.resize();
		} catch (error) {
			log('⚠️ Resize error: ' + error.message);
		}
	}

	getCytoscape() {
		return this.cy;
	}

	isInitialized() {
		return this.initialized;
	}

	destroy() {
		// Clear all state
		if (this.cy) {
			this.cy.elements().remove();
		}

		// Destroy Cytoscape instance if it exists
		if (this.cy) {
			this.cy.destroy();
			this.cy = null;
		}

		// Reset all flags and timeouts
		this.initialized = false;
		this.isLayoutRunning = false;

		if (this.layoutTimeout) {
			clearTimeout(this.layoutTimeout);
			this.layoutTimeout = null;
		}

		// log('🗑️ Visualization destroyed and reset');
	}

	// Update current room when it changes
	setCurrentRoom(roomName) {
		this.currentRoom = roomName;
	}
}
