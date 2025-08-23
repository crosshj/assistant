import cytoscape from 'cytoscape';
import { log, $ } from '../utils/utils.js';

// Cytoscape Visualization Management
export class GraphVisualization {
	constructor() {
		this.cy = null;
		this.layoutTimeout = null;
		this.initialized = false;
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
						'font-size': 12,
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
			],
			layout: { name: 'cose', animate: false },
		});

		this.setupEventHandlers();
		this.setupKeyboardShortcuts();
		this.setupSearchFunctionality();
		this.setupLayoutControls();

		this.initialized = true;
		log('Cytoscape visualization initialized');

		return this.cy;
	}

	setupEventHandlers() {
		if (!this.cy) return;

		// Cytoscape event handlers
		this.cy.on('select', 'node,edge', (e) => {
			const d = e.target.data();
			$('sel').textContent = JSON.stringify(d, null, 2);
			if (d.id) {
				if (e.target.isNode && e.target.isNode()) {
					$('nodeId').value = d.nid || '';
					$('nodeLabel').value = d.label || '';
					$('nodeProps').value = JSON.stringify(
						d.props || {},
						null,
						2
					);
				}
				if (e.target.isEdge && e.target.isEdge()) {
					$('edgeId').value = d.eid || '';
					$('edgeFrom').value = d.source?.replace('n_', '') || '';
					$('edgeTo').value = d.target?.replace('n_', '') || '';
					$('edgeLabel').value = d.label || '';
					$('edgeProps').value = JSON.stringify(
						d.props || {},
						null,
						2
					);
				}
			}
		});

		// Add double-click to center on node
		this.cy.on('dblclick', 'node', (e) => {
			this.cy.center(e.target);
			this.cy.fit(e.target, 50);
		});
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
		log(
			'📊 Node synced: ' +
				nodeData.id +
				' (' +
				(nodeData.label || nodeData.id) +
				')'
		);
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
		log(
			'📊 Edge synced: ' +
				edgeData.id +
				' (' +
				edgeData.from +
				' → ' +
				edgeData.to +
				')'
		);
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
		clearTimeout(this.layoutTimeout);
		this.layoutTimeout = setTimeout(() => {
			try {
				this.cy.layout({ name: 'cose', animate: false }).run();
			} catch (e) {
				log('⚠️ Layout error: ' + e.message);
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
