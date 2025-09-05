import { html } from '../_lib/utils.js';
import { GraphVisualization } from '../_lib/cytoscapeWrapper.js';
import './GraphView.css';

export class GraphView {
	constructor() {
		this.container = null;
		this.visualization = null;
		this.currentRoom = null;
		this.isVisualizationReady = false;
		this.eventQueue = [];

		// Debounce timers for graph updates
		this.graphUpdateTimers = {
			addNode: null,
			removeNode: null,
			addEdge: null,
			removeEdge: null,
		};

		// Bind event handlers to preserve context
		this.handleResizeGraph = this.handleResizeGraph.bind(this);
		this.handleClearGraph = this.handleClearGraph.bind(this);
		this.syncAddNode = this.syncAddNode.bind(this);
		this.syncRemoveNode = this.syncRemoveNode.bind(this);
		this.syncAddEdge = this.syncAddEdge.bind(this);
		this.syncRemoveEdge = this.syncRemoveEdge.bind(this);

		this.render();
	}

	render() {
		// Find the graphview container
		this.container = document.getElementById('graphview-container');
		if (!this.container) {
			throw new Error('GraphView container not found');
		}

		// Create graph panel HTML - no card chrome, just controls and visualization
		this.container.innerHTML = html`
			<div
				class="graph-view-container"
				style="height: 100%; max-height: 100%; overflow: hidden; display: flex; flex-direction: column;"
			>
				<div class="graph-controls">
					<div class="row">
						<input
							id="searchNode"
							placeholder="Search nodes..."
							style="flex: 1"
						/>
						<button id="clearSearch">Clear</button>
						<select id="layoutSelect">
							<option value="cose">Force-directed</option>
							<option value="grid">Grid</option>
							<option
								value="circle"
								selected
							>
								Circle
							</option>
							<option value="concentric">Concentric</option>
						</select>
						<button id="fitGraph">Fit</button>
					</div>
				</div>
				<div
					id="cy"
					style="width: 100%; height: 100%; background: #0d1117; flex: 1;"
				></div>
			</div>
		`;
	}

	// Initialize visualization when needed
	initVisualization(roomName) {
		this.currentRoom = roomName;

		const initVisualization = () => {
			const container = document.getElementById('cy');
			if (!container) {
				setTimeout(initVisualization, 50);
				return;
			}

			// Check if container has dimensions
			const rect = container.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) {
				setTimeout(initVisualization, 50);
				return;
			}

			// Clean up any existing visualization
			if (this.visualization) {
				this.visualization.destroy();
			}

			// Create fresh visualization instance
			this.visualization = new GraphVisualization(roomName);
			const result = this.visualization.init('cy');

			// Visualization initialized successfully
			this.isVisualizationReady = true;
			this.processEventQueue();

			// Set up ResizeObserver to watch for container size changes
			this.setupResizeObserver();

			// Apply the currently selected layout only if there are nodes
			const layoutSelect = document.querySelector('#layoutSelect');
			if (layoutSelect && this.visualization.isInitialized()) {
				const selectedLayout = layoutSelect.value;
				// Apply the selected layout after a short delay to ensure visualization is ready
				setTimeout(() => {
					if (
						this.visualization &&
						this.visualization.cy &&
						this.visualization.cy.nodes().length > 0
					) {
						const layoutOptions = {
							name: selectedLayout,
							animate: false,
						};

						// Add padding for specific layouts
						if (selectedLayout === 'circle') {
							layoutOptions.padding = 100;
						} else if (selectedLayout === 'cose') {
							layoutOptions.padding = 150;
						}

						this.visualization.cy.layout(layoutOptions).run();
					}
				}, 300);
			}
		};

		// Start the initialization process
		initVisualization();
	}

	// Process queued events when visualization becomes ready
	processEventQueue() {
		if (this.eventQueue.length === 0) return;

		// Process all queued events
		while (this.eventQueue.length > 0) {
			const event = this.eventQueue.shift();
			const { type, data } = event;

			switch (type) {
				case 'addNode':
					this.syncAddNode(data);
					break;
				case 'removeNode':
					this.syncRemoveNode(data);
					break;
				case 'addEdge':
					this.syncAddEdge(data);
					break;
				case 'removeEdge':
					this.syncRemoveEdge(data);
					break;
				case 'clearGraph':
					this.handleClearGraph();
					break;
				default:
					console.warn(
						'🎨 GraphView: Unknown queued event type:',
						type
					);
			}
		}
	}

	// Queue an event if visualization isn't ready
	queueEvent(type, data) {
		this.eventQueue.push({ type, data });
	}

	handleClearGraph() {
		// If visualization isn't ready, queue the request
		if (!this.visualization || !this.visualization.isInitialized()) {
			this.queueEvent('clearGraph');
			return;
		}
		this.visualization.clearGraph();
	}

	syncAddNode(nodeData) {
		console.log('🎨 GraphView: syncAddNode called with:', nodeData);
		// If visualization isn't ready, queue the update for later
		if (!this.visualization || !this.visualization.isInitialized()) {
			console.log(
				'🎨 GraphView: Visualization not ready, queuing addNode event'
			);
			this.queueEvent('addNode', nodeData);
			return;
		}

		// Add node immediately instead of debouncing
		if (this.visualization && this.visualization.isInitialized()) {
			console.log('🎨 GraphView: Adding node to visualization');
			this.visualization.addNode(nodeData.data);
		}
	}

	syncRemoveNode(nodeData) {
		// If visualization isn't ready, queue the request
		if (!this.visualization || !this.visualization.isInitialized()) {
			this.queueEvent('removeNode', nodeData);
			return;
		}

		if (this.graphUpdateTimers.removeNode) {
			clearTimeout(this.graphUpdateTimers.removeNode);
		}

		this.graphUpdateTimers.removeNode = setTimeout(() => {
			if (this.visualization && this.visualization.isInitialized()) {
				this.visualization.removeNode(nodeData.id);
			}
		}, 100);
	}

	syncAddEdge(edgeData) {
		// If visualization isn't ready, queue the request
		if (!this.visualization || !this.visualization.isInitialized()) {
			this.queueEvent('addEdge', edgeData);
			return;
		}

		if (this.graphUpdateTimers.addEdge) {
			clearTimeout(this.graphUpdateTimers.addEdge);
		}

		this.graphUpdateTimers.addEdge = setTimeout(() => {
			if (this.visualization && this.visualization.isInitialized()) {
				this.visualization.addEdge(edgeData.data);
			}
		}, 100);
	}

	syncRemoveEdge(edgeData) {
		// If visualization isn't ready, queue the request
		if (!this.visualization || !this.visualization.isInitialized()) {
			this.queueEvent('removeEdge', edgeData);
			return;
		}

		if (this.graphUpdateTimers.removeEdge) {
			clearTimeout(this.graphUpdateTimers.removeEdge);
		}

		this.graphUpdateTimers.removeEdge = setTimeout(() => {
			if (this.visualization && this.visualization.isInitialized()) {
				this.visualization.removeEdge(edgeData.id);
			}
		}, 100);
	}

	handleResizeGraph() {
		if (this.visualization && this.visualization.isInitialized()) {
			this.visualization.resize();
		}
	}

	// Set up ResizeObserver to watch for container size changes
	setupResizeObserver() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}

		const graphContainer = document.getElementById('cy');
		if (graphContainer) {
			this.resizeObserver = new ResizeObserver(() => {
				this.handleResizeGraph();
			});
			this.resizeObserver.observe(graphContainer);
		}
	}

	// Clean up method
	destroy() {
		// Clean up debounce timers
		if (this.graphUpdateTimers) {
			Object.values(this.graphUpdateTimers).forEach((timer) => {
				if (timer) clearTimeout(timer);
			});
		}

		// Clean up ResizeObserver
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		// Clean up visualization
		if (this.visualization && this.visualization.isInitialized()) {
			this.visualization.destroy();
			this.visualization = null;
		}

		// Reset state
		this.isVisualizationReady = false;
		this.eventQueue = [];
	}
}
