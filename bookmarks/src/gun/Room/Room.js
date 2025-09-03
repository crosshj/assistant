import { html } from '../_lib/utils.js';
import { GraphVisualization } from '../_lib/cytoscapeWrapper.js';
import './Room.css';

export class Room {
	constructor({ controller }) {
		this.controller = controller; // Reference to RoomController
		this.visualization = null; // Will be created fresh each time
		this.container = null;
		this.currentMode = 'connecting'; // 'connecting', 'room-selection', 'room-mode'
		this.currentRoom = null;

		// Debounce timers for graph updates
		this.graphUpdateTimers = {
			addNode: null,
			removeNode: null,
			addEdge: null,
			removeEdge: null,
		};

		// Debounce delay in milliseconds
		const DEBOUNCE_DELAY = 100;

		// Event queue for operations that arrive before visualization is ready
		this.eventQueue = [];
		this.isVisualizationReady = false;

		// Bind event handlers to preserve context
		this.handleResizeGraph = this.handleResizeGraph.bind(this);
		this.handleUpdateNodeForm = this.handleUpdateNodeForm.bind(this);
		this.handleUpdateEdgeForm = this.handleUpdateEdgeForm.bind(this);

		// Bind sync event handlers to preserve context
		this.handleClearGraph = this.handleClearGraph.bind(this);
		this.syncAddNode = this.syncAddNode.bind(this);
		this.syncRemoveNode = this.syncRemoveNode.bind(this);
		this.syncAddEdge = this.syncAddEdge.bind(this);
		this.syncRemoveEdge = this.syncRemoveEdge.bind(this);

		this.render();
	}

	render() {
		// Find the left pane container
		const leftPane = document.getElementById('left-pane');
		if (!leftPane) {
			console.error('Left pane container not found');
			return;
		}
		this.container = { left: leftPane };

		// Create all panel HTML upfront (but don't render them yet)
		this.renderEditPanel();
		this.renderGraphPanel();

		// Start in connecting mode by default
		this.setMode('connecting');

		// Bind only the events that are available in room selection mode
		this.bindRoomListEvents();

		// UI events are now handled by RoomController calling methods directly
		// No need for DOM event listeners here
	}

	renderRoomList() {
		// Clear left pane
		this.container.left.innerHTML = '';

		// Render room list with sub-grid layout
		this.container.left.innerHTML = html`
			<div class="left-pane-sub-grid room-selection-layout">
				<div
					class="room-list"
					id="roomList"
				>
					<div class="room-list-header">
						<h2>Select a Graph</h2>
						<p>Choose a graph and start collaborating</p>
					</div>
					<div class="room-grid">
						<div
							class="room-card"
							data-room="public"
						>
							<div class="room-icon">🏠</div>
							<h3>public</h3>
							<p>Select this graph to start working</p>
							<button class="join-room-btn">Select Graph</button>
						</div>
						<div
							class="room-card"
							data-room="super-duper"
						>
							<div class="room-icon">🏠</div>
							<h3>super-duper</h3>
							<p>Select this graph to start working</p>
							<button class="join-room-btn">Select Graph</button>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	renderEditPanel() {
		// Store edit panel HTML for later use in sub-grid
		this.editPanelHTML = html`
			<section
				class="card edit-panel"
				id="editPanel"
				style="height: 100%; max-height: 100%; overflow: hidden;"
			>
				<header><h3 style="margin: 0">Edit</h3></header>
				<div class="body">
					<details open>
						<summary><b>New node</b></summary>
						<div
							class="row"
							style="margin: 0.5rem 0"
						>
							<input
								id="nodeId"
								class="mono"
								placeholder="node id (auto if blank)"
							/>
							<input
								id="nodeLabel"
								placeholder="label"
							/>
						</div>
						<label>Props (JSON object)</label>
						<textarea
							id="nodeProps"
							class="mono"
							rows="5"
							placeholder='{"url":"https://example.com","tags":["link"],"note":"..."}'
						></textarea>
						<div class="row">
							<button
								id="addNode"
								class="primary"
							>
								Upsert node
							</button>
							<button id="delNode">Delete node</button>
						</div>
					</details>
					<hr style="border-color: #2a323a" />
					<details open>
						<summary><b>New edge</b></summary>
						<div
							class="row"
							style="margin: 0.5rem 0"
						>
							<input
								id="edgeId"
								class="mono"
								placeholder="edge id (auto if blank)"
							/>
							<input
								id="edgeFrom"
								class="mono"
								placeholder="from id"
							/>
							<input
								id="edgeTo"
								class="mono"
								placeholder="to id"
							/>
							<input
								id="edgeLabel"
								placeholder="label"
							/>
						</div>
						<div
							class="row"
							style="margin: 0.5rem 0"
						>
							<select
								id="edgeDirection"
								style="flex: 1"
							>
								<option value="both">Both (↔)</option>
								<option value="forward">Forward (→)</option>
								<option value="reverse">Reverse (←)</option>
							</select>
						</div>
						<label>Props (JSON object)</label>
						<textarea
							id="edgeProps"
							class="mono"
							rows="4"
							placeholder='{"weight":1}'
						></textarea>
						<div class="row">
							<button
								id="addEdge"
								class="primary"
							>
								Upsert edge
							</button>
							<button id="delEdge">Delete edge</button>
						</div>
					</details>
					<hr style="border-color: #2a323a" />
					<div class="row">
						<button id="exportBtn">Export JSON</button>
						<input
							type="file"
							id="importFile"
							accept="application/json"
						/>
						<button id="clearLocal">Clear local cache</button>
					</div>
					<p class="note">
						Data model: <code>graphs/{room}/nodes/{id}</code> and
						<code>graphs/{room}/edges/{id}</code>.
					</p>
				</div>
			</section>
		`;
	}

	renderGraphPanel() {
		// Store edit panel HTML for later use in sub-grid
		this.graphPanelHTML = html`
			<section
				class="card graph-panel"
				id="graphPanel"
				style="height: 100%; max-height: 100%; overflow: hidden;"
			>
				<header><h3 style="margin: 0">Graph</h3></header>
				<div
					class="body"
					style="padding: 0; height: calc(100% - 50px); max-height: calc(100% - 50px); overflow: hidden;"
				>
					<div
						style="
							padding: 0.5rem 0.75rem;
							border-bottom: 1px solid #30363d;
						"
					>
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
						style="width: 100%; height: 100%; background: #0d1117;"
					></div>
				</div>
			</section>
		`;
	}

	bindEvents() {
		// Room list events
		this.bindRoomListEvents();

		// Edit panel events
		this.bindEditPanelEvents();

		// Graph panel events
		this.bindGraphPanelEvents();

		// External events are now handled by RoomController calling methods directly
		// No need for DOM event listeners here

		// Sync events are now set up in constructor to ensure they're always available
	}

	bindRoomListEvents() {
		// Join room buttons
		const joinButtons =
			this.container.left.querySelectorAll('.join-room-btn');
		joinButtons.forEach((button) => {
			button.addEventListener('click', (event) => {
				event.stopPropagation();
				const roomCard = button.closest('.room-card');
				const roomName = roomCard.dataset.room;
				this.joinRoom(roomName);
			});
		});

		// Room card clicks
		const roomCards = this.container.left.querySelectorAll('.room-card');
		roomCards.forEach((card) => {
			card.addEventListener('click', (event) => {
				if (event.target.classList.contains('join-room-btn')) return;
				const roomName = card.dataset.room;
				this.joinRoom(roomName);
			});
		});
	}

	bindEditPanelEvents() {
		// Node operations
		const addNodeBtn = this.container.left.querySelector('#addNode');
		if (addNodeBtn) {
			addNodeBtn.addEventListener('click', () => {
				this.handleNodeCreate();
			});
		}

		const delNodeBtn = this.container.left.querySelector('#delNode');
		if (delNodeBtn) {
			delNodeBtn.addEventListener('click', () => {
				this.handleNodeDelete();
			});
		}

		// Edge operations
		const addEdgeBtn = this.container.left.querySelector('#addEdge');
		if (addEdgeBtn) {
			addEdgeBtn.addEventListener('click', () => {
				this.handleEdgeCreate();
			});
		}

		const delEdgeBtn = this.container.left.querySelector('#delEdge');
		if (delEdgeBtn) {
			delEdgeBtn.addEventListener('click', () => {
				this.handleEdgeDelete();
			});
		}

		// Import/Export
		const exportBtn = this.container.left.querySelector('#exportBtn');
		if (exportBtn) {
			exportBtn.addEventListener('click', () => {
				this.handleExport();
			});
		}

		const importFile = this.container.left.querySelector('#importFile');
		if (importFile) {
			importFile.addEventListener('change', (event) => {
				this.handleImport(event);
			});
		}

		const clearLocalBtn = this.container.left.querySelector('#clearLocal');
		if (clearLocalBtn) {
			clearLocalBtn.addEventListener('click', () => {
				this.handleClearLocal();
			});
		}
	}

	bindGraphPanelEvents() {
		// Search functionality
		const searchInput = this.container.left.querySelector('#searchNode');
		if (searchInput) {
			searchInput.addEventListener('input', (event) => {
				this.handleSearch(event.target.value);
			});
		}

		const clearSearchBtn =
			this.container.left.querySelector('#clearSearch');
		if (clearSearchBtn) {
			clearSearchBtn.addEventListener('click', () => {
				this.handleClearSearch();
			});
		}

		// Layout selection
		const layoutSelect = this.container.left.querySelector('#layoutSelect');
		if (layoutSelect) {
			layoutSelect.addEventListener('change', (event) => {
				this.handleLayoutChange(event.target.value);
			});
		}

		const fitGraphBtn = this.container.left.querySelector('#fitGraph');
		if (fitGraphBtn) {
			fitGraphBtn.addEventListener('click', () => {
				this.handleFitGraph();
			});
		}
	}

	// Mode management
	showConnectingMode() {
		this.currentMode = 'connecting';

		// Completely tear down visualization when switching to connecting mode
		if (this.visualization && this.visualization.isInitialized()) {
			this.visualization.destroy();
			this.visualization = null;
		}

		// Reset visualization state
		this.isVisualizationReady = false;
		this.eventQueue = [];

		// Clear left pane - show blank when disconnected, spinner when connecting
		this.container.left.innerHTML = '';
	}

	showConnectingSpinner() {
		// Show loading spinner when actively connecting (user clicked Connect button)
		this.container.left.innerHTML = html`
			<div class="left-pane-sub-grid room-selection-layout">
				<div class="loading-spinner">
					<div class="spinner"></div>
				</div>
			</div>
		`;
	}

	showRoomSelectionMode() {
		this.currentMode = 'room-selection';

		// Switch to room selection layout (full width)
		this.container.left.innerHTML = html`
			<div class="left-pane-sub-grid room-selection-layout">
				<div
					class="room-list"
					id="roomList"
				>
					<div class="room-list-header">
						<h2>Select a Graph</h2>
						<p>Choose a graph and start collaborating</p>
					</div>
					<div class="room-grid">
						<div
							class="room-card"
							data-room="public"
						>
							<div class="room-icon">🏠</div>
							<h3>public</h3>
							<p>Select this graph to start working</p>
							<button class="join-room-btn">Select Graph</button>
						</div>
						<div
							class="room-card"
							data-room="super-duper"
						>
							<div class="room-icon">🏠</div>
							<h3>super-duper</h3>
							<p>Select this graph to start working</p>
							<button class="join-room-btn">Select Graph</button>
						</div>
					</div>
				</div>
			</div>
		`;

		// Re-bind room list events
		this.bindRoomListEvents();
	}

	showInRoomMode() {
		this.currentMode = 'room-mode';

		// Switch to in-room layout (edit + graph side by side)
		this.container.left.innerHTML = html`
			<div class="left-pane-sub-grid in-room-layout">
				<div class="edit-panel-container">
					${this.editPanelHTML || '<!-- Edit panel HTML missing -->'}
				</div>
				<div class="graph-panel-container">
					${this.graphPanelHTML ||
					'<!-- Graph panel HTML missing -->'}
				</div>
			</div>
		`;

		// Re-bind edit and graph panel events
		this.bindEditPanelEvents();
		this.bindGraphPanelEvents();

		// Initialize visualization when entering room mode
		// Only initialize if not already ready
		if (!this.isVisualizationReady) {
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
				this.visualization = new GraphVisualization(this.currentRoom);
				const result = this.visualization.init('cy');

				// Visualization initialized successfully

				// Mark visualization as ready and process any queued events
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
	}

	// Room operations - these are now just UI state updates
	// The actual room joining is handled by RoomController
	joinRoom(roomName) {
		// Call controller method directly
		this.controller.onJoinRoom(roomName);
	}

	leaveRoom() {
		this.currentRoom = null;

		// Completely tear down visualization when leaving a room
		if (this.visualization && this.visualization.isInitialized()) {
			this.visualization.destroy();
			this.visualization = null;
		}

		// Reset visualization state to ensure fresh initialization on rejoin
		this.isVisualizationReady = false;
		this.eventQueue = [];

		this.showRoomSelectionMode();

		// Don't call controller method - this creates a circular call!
		// The controller already called this method, so we don't need to call back
	}

	// Node operations
	handleNodeCreate() {
		const nodeId = this.container.left
			.querySelector('#nodeId')
			.value.trim();
		const nodeLabel = this.container.left
			.querySelector('#nodeLabel')
			.value.trim();
		const nodeProps = this.container.left
			.querySelector('#nodeProps')
			.value.trim();

		let props = {};
		if (nodeProps) {
			try {
				props = JSON.parse(nodeProps);
			} catch (e) {
				console.error('Invalid JSON in props:', e);
				return;
			}
		}

		const nodeData = {
			label: nodeLabel || '',
			props: props,
		};

		if (nodeId) {
			nodeData.id = nodeId;
		}

		// Call controller method directly
		this.controller.onNodeCreate({
			room: this.currentRoom,
			data: nodeData,
		});
	}

	handleNodeDelete() {
		const nodeId = this.container.left
			.querySelector('#nodeId')
			.value.trim();
		if (!nodeId) return;

		// Call controller method directly
		this.controller.onNodeDelete({ room: this.currentRoom, id: nodeId });
	}

	// Edge operations
	handleEdgeCreate() {
		const edgeId = this.container.left
			.querySelector('#edgeId')
			.value.trim();
		const edgeFrom = this.container.left
			.querySelector('#edgeFrom')
			.value.trim();
		const edgeTo = this.container.left
			.querySelector('#edgeTo')
			.value.trim();
		const edgeLabel = this.container.left
			.querySelector('#edgeLabel')
			.value.trim();
		const edgeDirection =
			this.container.left.querySelector('#edgeDirection').value;
		const edgeProps = this.container.left
			.querySelector('#edgeProps')
			.value.trim();

		if (!edgeFrom || !edgeTo) {
			console.error('From and To IDs are required');
			return;
		}

		let props = {};
		if (edgeProps) {
			try {
				props = JSON.parse(edgeProps);
			} catch (e) {
				console.error('Invalid JSON in props:', e);
				return;
			}
		}

		const edgeData = {
			from: edgeFrom,
			to: edgeTo,
			label: edgeLabel || '',
			direction: edgeDirection,
			props: props,
		};

		if (edgeId) {
			edgeData.id = edgeId;
		}

		// Call controller method directly
		this.controller.onEdgeCreate({
			room: this.currentRoom,
			data: edgeData,
		});
	}

	handleEdgeDelete() {
		const edgeId = this.container.left
			.querySelector('#edgeId')
			.value.trim();
		if (!edgeId) return;

		// Call controller method directly
		this.controller.onEdgeDelete({ room: this.currentRoom, id: edgeId });
	}

	// Import/Export
	handleExport() {
		// Call controller method directly
		this.controller.handleGraphExport({ room: this.currentRoom });
	}

	handleImport(event) {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = JSON.parse(e.target.result);
				// Call controller method directly
				this.controller.handleGraphImport({
					room: this.currentRoom,
					data: data,
				});
			} catch (error) {
				console.error('Failed to parse import file:', error);
			}
		};
		reader.readAsText(file);
	}

	handleClearLocal() {
		// Call controller method directly
		this.controller.handleGraphClearLocal({ room: this.currentRoom });
	}

	// Graph operations
	handleSearch(query) {
		// Call controller method directly
		this.controller.handleGraphSearch({
			room: this.currentRoom,
			query: query,
		});
	}

	handleClearSearch() {
		// Call controller method directly
		this.controller.handleGraphClearSearch({ room: this.currentRoom });
	}

	handleLayoutChange(layout) {
		// Call controller method directly
		this.controller.handleGraphLayoutChange({
			room: this.currentRoom,
			layout: layout,
		});
	}

	handleFitGraph() {
		// Call controller method directly
		this.controller.handleGraphFit({ room: this.currentRoom });
	}

	// Public methods for external updates
	setMode(mode) {
		// Prevent unnecessary mode switches
		if (this.currentMode === mode) {
			return;
		}

		switch (mode) {
			case 'connecting':
				this.showConnectingMode();
				break;
			case 'room-selection':
				this.showRoomSelectionMode();
				break;
			case 'room-mode':
				this.showInRoomMode();
				break;
		}
	}

	getCurrentMode() {
		return this.currentMode;
	}

	getCurrentRoom() {
		return this.currentRoom;
	}

	// Form update methods for external access
	updateNodeForm(data) {
		const nodeIdInput = this.container.left.querySelector('#nodeId');
		const nodeLabelInput = this.container.left.querySelector('#nodeLabel');
		const nodePropsInput = this.container.left.querySelector('#nodeProps');

		if (nodeIdInput && data.id) nodeIdInput.value = data.id;
		if (nodeLabelInput && data.label) nodeLabelInput.value = data.label;
		if (nodePropsInput && data.props) {
			nodePropsInput.value = JSON.stringify(data.props, null, 2);
		}
	}

	updateEdgeForm(data) {
		const edgeIdInput = this.container.left.querySelector('#edgeId');
		const edgeFromInput = this.container.left.querySelector('#edgeFrom');
		const edgeToInput = this.container.left.querySelector('#edgeTo');
		const edgeLabelInput = this.container.left.querySelector('#edgeLabel');
		const edgePropsInput = this.container.left.querySelector('#edgeProps');

		if (edgeIdInput && data.id) edgeIdInput.value = data.id;
		if (edgeFromInput && data.from) edgeFromInput.value = data.from;
		if (edgeToInput && data.to) edgeToInput.value = data.to;
		if (edgeLabelInput && data.label) edgeLabelInput.value = data.label;
		if (edgePropsInput && data.props) {
			edgePropsInput.value = JSON.stringify(data.props, null, 2);
		}
	}

	// ===== HANDLER METHODS (called by controller) =====

	// Room state management methods called by controller
	handleRoomJoined(roomName) {
		this.currentRoom = roomName;

		// Update visualization with current room
		if (this.visualization) {
			this.visualization.setCurrentRoom(roomName);
		}

		if (this.currentMode !== 'room-mode') {
			this.setMode('room-mode');
		} else {
			console.log(
				'🎨 ROOM: handleRoomJoined called but already in room mode'
			);
		}
	}

	handleRoomLeft() {
		this.currentRoom = null;
		this.setMode('room-selection');
	}

	// UI update methods called by controller
	handleResizeGraph() {
		if (this.visualization && this.visualization.isInitialized()) {
			this.visualization.resize();
		}
	}

	handleUpdateNodeForm(data) {
		this.updateNodeForm(data);
	}

	handleUpdateEdgeForm(data) {
		this.updateEdgeForm(data);
	}

	// State change method called by controller
	handleStateChange(stateData) {
		// Handle any state changes that affect the UI
	}

	// UI join room method called by controller
	handleJoinRoom() {
		this.setMode('connecting');
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
					console.warn('🎨 ROOM: Unknown queued event type:', type);
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
		// If visualization isn't ready, queue the update for later
		if (!this.visualization || !this.visualization.isInitialized()) {
			this.queueEvent('addNode', nodeData);
			return;
		}

		// Add node immediately instead of debouncing
		// Debouncing was causing nodes to be canceled when multiple came in
		if (this.visualization && this.visualization.isInitialized()) {
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
		}, this.DEBOUNCE_DELAY);
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
		}, this.DEBOUNCE_DELAY);
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
		}, this.DEBOUNCE_DELAY);
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

	handleUpdateNodeForm(detail) {
		this.updateNodeForm(detail.data);
	}

	handleUpdateEdgeForm(detail) {
		this.updateEdgeForm(detail.data);
	}

	destroy() {
		// Clean up local UI event listeners
		// Room list events
		const joinButtons =
			this.container?.left?.querySelectorAll('.join-room-btn');
		if (joinButtons) {
			joinButtons.forEach((button) => {
				button.removeEventListener('click', this.joinRoom);
			});
		}

		const roomCards = this.container?.left?.querySelectorAll('.room-card');
		if (roomCards) {
			roomCards.forEach((card) => {
				card.removeEventListener('click', this.joinRoom);
			});
		}

		// Edit panel events
		const addNodeBtn = this.container?.left?.querySelector('#addNode');
		if (addNodeBtn) {
			addNodeBtn.removeEventListener('click', this.handleNodeCreate);
		}

		const delNodeBtn = this.container?.left?.querySelector('#delNode');
		if (delNodeBtn) {
			delNodeBtn.removeEventListener('click', this.handleDeleteNode);
		}

		const addEdgeBtn = this.container?.left?.querySelector('#addEdge');
		if (addEdgeBtn) {
			addEdgeBtn.removeEventListener('click', this.handleAddEdge);
		}

		const delEdgeBtn = this.container?.left?.querySelector('#delEdge');
		if (delEdgeBtn) {
			delEdgeBtn.removeEventListener('click', this.handleEdgeDelete);
		}

		const exportBtn = this.container?.left?.querySelector('#exportBtn');
		if (exportBtn) {
			exportBtn.removeEventListener('click', this.handleExport);
		}

		const importFile = this.container?.left?.querySelector('#importFile');
		if (importFile) {
			importFile.removeEventListener('change', this.handleImport);
		}

		const clearLocalBtn =
			this.container?.left?.querySelector('#clearLocal');
		if (clearLocalBtn) {
			clearLocalBtn.removeEventListener('click', this.handleClearLocal);
		}

		// Graph panel events
		const searchInput = this.container?.left?.querySelector('#searchNode');
		if (searchInput) {
			searchInput.removeEventListener('input', this.handleSearch);
		}

		const clearSearchBtn =
			this.container?.left?.querySelector('#clearSearch');
		if (clearSearchBtn) {
			clearSearchBtn.removeEventListener('click', this.handleClearSearch);
		}

		const layoutSelect =
			this.container?.left?.querySelector('#layoutSelect');
		if (layoutSelect) {
			layoutSelect.removeEventListener('change', this.handleLayoutChange);
		}

		const fitGraphBtn = this.container?.left?.querySelector('#fitGraph');
		if (fitGraphBtn) {
			fitGraphBtn.removeEventListener('click', this.handleFitGraph);
		}

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

	clearPropsField(elementType) {
		if (elementType === 'node') {
			const nodePropsField = document.getElementById('nodeProps');
			if (nodePropsField) {
				nodePropsField.value = '';
			}
		} else if (elementType === 'edge') {
			const edgePropsField = document.getElementById('edgeProps');
			if (edgePropsField) {
				edgePropsField.value = '';
			}
		}
	}

	showLoading(show) {
		// Update the "New node" section
		const nodePropsField = document.getElementById('nodeProps');
		if (nodePropsField) {
			if (show) {
				nodePropsField.placeholder = 'Loading props...';
				nodePropsField.disabled = true;
			} else {
				nodePropsField.placeholder =
					'{"url":"https://example.com","tags":["link"],"note":"..."}';
				nodePropsField.disabled = false;
			}
		}

		// Update the "New edge" section
		const edgePropsField = document.getElementById('edgeProps');
		if (edgePropsField) {
			if (show) {
				edgePropsField.placeholder = 'Loading props...';
				edgePropsField.disabled = true;
			} else {
				edgePropsField.placeholder = '{"weight":1}';
				edgePropsField.disabled = false;
			}
		}
	}

	startPropsLoading(elementType) {
		// Clear the props field immediately to show loading state
		this.clearPropsField(elementType);

		// Show loading spinner
		this.showLoading(true);
	}

	clearPropsLoading() {
		// Hide loading spinner
		this.showLoading(false);

		// Clear both node and edge props fields
		this.clearPropsField('node');
		this.clearPropsField('edge');
	}

	updatePropsField(elementType, props) {
		try {
			const safeProps = this.extractSafeProps(props);
			const propsJson = JSON.stringify(safeProps, null, 2);

			if (elementType === 'node') {
				const nodePropsField = document.getElementById('nodeProps');
				if (nodePropsField) {
					nodePropsField.value = propsJson;
				}
			} else if (elementType === 'edge') {
				const edgePropsField = document.getElementById('edgeProps');
				if (edgePropsField) {
					edgePropsField.value = propsJson;
				}
			}

			// Hide loading spinner after updating props
			this.showLoading(false);
		} catch (error) {
			console.error('❌ Room: Error updating props field:', error);
			// Hide loading spinner even on error
			this.showLoading(false);
		}
	}

	extractSafeProps(gunObj) {
		// EventCoordinator now sends clean props, so just return them
		return gunObj || {};
	}
}
