// Graph View Component - Graph visualization and controls
export class GraphView {
	constructor(visualization) {
		this.visualization = visualization;
	}

	setupEventHandlers() {
		// Search functionality
		$('searchNode').addEventListener('input', (e) => {
			const searchTerm = e.target.value.toLowerCase();
			if (searchTerm === '') {
				this.visualization.cy
					.elements()
					.removeClass('search-highlight');
				return;
			}

			this.visualization.cy.elements().removeClass('search-highlight');
			this.visualization.cy.nodes().forEach((node) => {
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
			this.visualization.cy.elements().removeClass('search-highlight');
		});

		// Layout controls
		$('layoutSelect').addEventListener('change', (e) => {
			const layout = e.target.value;
			this.visualization.cy.layout({ name: layout, animate: true }).run();
		});

		$('fitGraph').addEventListener('click', () => {
			this.visualization.cy.fit();
			this.visualization.cy.center();
		});

		// Setup visualization event handlers
		this.setupVisualizationEvents();
	}

	setupVisualizationEvents() {
		if (!this.visualization.cy) return;

		// Element selection
		this.visualization.cy.on('select', 'node,edge', (e) => {
			const d = e.target.data();
			$('sel').textContent = JSON.stringify(d, null, 2);

			if (d.id) {
				if (e.target.isNode && e.target.isNode()) {
					window.updateNodeForm && window.updateNodeForm(d);
				}
				if (e.target.isEdge && e.target.isEdge()) {
					window.updateEdgeForm && window.updateEdgeForm(d);
				}
			}
		});

		// Double-click to center on node
		this.visualization.cy.on('dblclick', 'node', (e) => {
			this.visualization.cy.center(e.target);
			this.visualization.cy.fit(e.target, 50);
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
}

// Helper functions
const $ = (id) => document.getElementById(id);
