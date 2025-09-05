import { log, addEventListener, dispatchEvent } from '../_lib/utils.js';
import { GraphView } from './GraphView.js';

/**
 * GraphViewController
 * Handles all graph view events and coordinates with visualization
 */
export class GraphViewController {
	constructor() {
		this.ui = new GraphView();

		// Bind controller methods
		this.handleRoomJoined = this.handleRoomJoined.bind(this);
		this.handleRoomLeft = this.handleRoomLeft.bind(this);
		this.handleClearGraph = this.ui.handleClearGraph.bind(this.ui);
		this.syncAddNode = this.ui.syncAddNode.bind(this.ui);
		this.syncRemoveNode = this.ui.syncRemoveNode.bind(this.ui);
		this.syncAddEdge = this.ui.syncAddEdge.bind(this.ui);
		this.syncRemoveEdge = this.ui.syncRemoveEdge.bind(this.ui);
		this.handleGraphSearch = this.handleGraphSearch.bind(this);
		this.handleGraphClearSearch = this.handleGraphClearSearch.bind(this);
		this.handleGraphLayoutChange = this.handleGraphLayoutChange.bind(this);
		this.handleGraphFit = this.handleGraphFit.bind(this);

		// Setup event listeners
		this.setupEventListeners();
		this.setupUIEventDelegation();
		this.setupResizeHandler();
	}

	setupEventListeners() {
		console.log('🎨 GraphView: Setting up event listeners');

		// Room lifecycle events
		addEventListener('room:joined', this.handleRoomJoined);
		addEventListener('room:left', this.handleRoomLeft);

		// Sync events - listen to the same events as Room
		addEventListener('sync:clearGraph', this.handleClearGraph);
		addEventListener('sync:addNode', (event) => {
			console.log(
				'🎨 GraphView: Received sync:addNode event',
				event.detail
			);
			this.syncAddNode(event.detail);
		});
		addEventListener('sync:removeNode', (event) =>
			this.syncRemoveNode(event.detail)
		);
		addEventListener('sync:addEdge', (event) => {
			console.log(
				'🎨 GraphView: Received sync:addEdge event',
				event.detail
			);
			this.syncAddEdge(event.detail);
		});
		addEventListener('sync:removeEdge', (event) =>
			this.syncRemoveEdge(event.detail)
		);

		// Graph operation events
		addEventListener('graph:search', this.handleGraphSearch);
		addEventListener('graph:clearSearch', this.handleGraphClearSearch);
		addEventListener('graph:layoutChange', this.handleGraphLayoutChange);
		addEventListener('graph:fit', this.handleGraphFit);
	}

	setupUIEventDelegation() {
		// Event delegation for UI buttons (scoped to component DOM)
		this.ui.container.addEventListener('click', (e) => {
			if (e.target.matches('#clearSearch')) {
				this.handleGraphClearSearch();
			}
			if (e.target.matches('#fitGraph')) {
				this.handleGraphFit();
			}
		});

		// Search input
		this.ui.container.addEventListener('input', (e) => {
			if (e.target.matches('#searchNode')) {
				this.handleGraphSearch({ query: e.target.value });
			}
		});

		// Layout selection
		this.ui.container.addEventListener('change', (e) => {
			if (e.target.matches('#layoutSelect')) {
				this.handleGraphLayoutChange({ layout: e.target.value });
			}
		});
	}

	setupResizeHandler() {
		// Store reference to resize handler for cleanup
		this.resizeHandler = () => {
			if (
				this.ui &&
				this.ui.visualization &&
				this.ui.visualization.isInitialized()
			) {
				this.ui.handleResizeGraph();
			}
		};

		// Handle window resize to ensure Cytoscape canvas stays properly sized
		window.addEventListener('resize', this.resizeHandler);
	}

	// Room lifecycle event handlers
	handleRoomJoined(event) {
		const { room } = event.detail;
		console.log(
			'🎨 GraphView: Room joined, initializing visualization for room:',
			room
		);
		// Initialize visualization when room is joined
		this.ui.initVisualization(room);
	}

	handleRoomLeft(event) {
		// Clean up visualization when room is left
		if (this.ui.visualization && this.ui.visualization.isInitialized()) {
			this.ui.visualization.destroy();
			this.ui.visualization = null;
		}
		this.ui.isVisualizationReady = false;
		this.ui.eventQueue = [];
	}

	// Graph operation handlers
	handleGraphSearch({ query }) {
		if (!query) return;

		// Dispatch search event for other components to handle
		dispatchEvent('graph:searchRequested', { query });
	}

	handleGraphClearSearch() {
		// Clear search in visualization if it exists
		if (this.ui.visualization && this.ui.visualization.isInitialized()) {
			const searchInput = this.ui.container.querySelector('#searchNode');
			if (searchInput) {
				searchInput.value = '';
			}
			// Clear search highlights
			this.ui.visualization.cy.elements().removeClass('search-highlight');
		}

		// Dispatch clear search event
		dispatchEvent('graph:searchCleared');
	}

	handleGraphLayoutChange({ layout }) {
		if (!layout) return;

		// Apply layout to visualization if it exists
		if (this.ui.visualization && this.ui.visualization.isInitialized()) {
			const layoutOptions = { name: layout, animate: true };

			// Add padding for specific layouts
			if (layout === 'circle') {
				layoutOptions.padding = 100;
			} else if (layout === 'cose') {
				layoutOptions.padding = 150;
			}

			this.ui.visualization.cy.layout(layoutOptions).run();
		}

		// Dispatch layout change event
		dispatchEvent('graph:layoutChange', { layout });
	}

	handleGraphFit() {
		// Fit graph to view if visualization exists
		if (this.ui.visualization && this.ui.visualization.isInitialized()) {
			this.ui.visualization.cy.fit();
			this.ui.visualization.cy.center();
		}

		// Dispatch fit event
		dispatchEvent('graph:fitRequested');
	}

	// Clean up method
	destroy() {
		// Clean up UI
		if (this.ui) {
			this.ui.destroy();
		}

		// Clean up resize handler
		if (this.resizeHandler) {
			window.removeEventListener('resize', this.resizeHandler);
		}
	}
}
