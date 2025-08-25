import { html } from '../lib/utils.js';
import { GraphVisualization } from '../lib/cytoscapeWrapper.js';
import './Room.css';

export class Room {
	constructor(graph, connection) {
		this.graph = graph;
		this.connection = connection;
		this.visualization = null; // Will be created fresh each time
		this.container = null;
		this.currentMode = 'connecting'; // 'connecting', 'room-selection', 'room-mode'
		this.currentRoom = null;

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

		// Start in room selection mode by default
		this.showRoomSelectionMode();

		// Bind only the events that are available in room selection mode
		this.bindRoomListEvents();

		// Listen for specific events that indicate what actually happened
		document.addEventListener('ui:joinRoom', (event) => {
			// User clicked join room - show connecting mode immediately
			this.setMode('connecting');
		});

		document.addEventListener('room:joined', (event) => {
			this.currentRoom = event.detail.room;
			this.setMode('room-mode');
		});

		document.addEventListener('room:left', () => {
			this.currentRoom = null;
			this.setMode('room-selection');
		});

		// Start in connecting mode by default
		this.setMode('connecting');
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
						<h2>Select a Room</h2>
						<p>Choose a room to join and start collaborating</p>
					</div>
					<div class="room-grid">
						<div
							class="room-card"
							data-room="public"
						>
							<div class="room-icon">🏠</div>
							<h3>public</h3>
							<p>Join this room to start working</p>
							<button class="join-room-btn">Join Room</button>
						</div>
						<div
							class="room-card"
							data-room="super-duper"
						>
							<div class="room-icon">🏠</div>
							<h3>super-duper</h3>
							<p>Join this room to start working</p>
							<button class="join-room-btn">Join Room</button>
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
								<option value="forward">Forward (→)</option>
								<option value="reverse">Reverse (←)</option>
								<option value="both">Both (↔)</option>
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
								<option value="circle">Circle</option>
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

		// Listen for external events

		// Listen for leave room event
		document.addEventListener('ui:leaveRoom', () => {
			this.leaveRoom();
		});

		// Listen for state changes
		document.addEventListener('stateChanged', (event) => {
			this.handleStateChange(event.detail);
		});
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
				this.handleAddNode();
			});
		}

		const delNodeBtn = this.container.left.querySelector('#delNode');
		if (delNodeBtn) {
			delNodeBtn.addEventListener('click', () => {
				this.handleDeleteNode();
			});
		}

		// Edge operations
		const addEdgeBtn = this.container.left.querySelector('#addEdge');
		if (addEdgeBtn) {
			addEdgeBtn.addEventListener('click', () => {
				this.handleAddEdge();
			});
		}

		const delEdgeBtn = this.container.left.querySelector('#delEdge');
		if (delEdgeBtn) {
			delEdgeBtn.addEventListener('click', () => {
				this.handleDeleteEdge();
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
		this.container.left.innerHTML = ''; // Clear left pane
		this.container.center.innerHTML = ''; // Clear center pane
	}

	showConnectingMode() {
		this.currentMode = 'connecting';

		// Show minimal loading state with just a spinner
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
						<h2>Select a Room</h2>
						<p>Choose a room to join and start collaborating</p>
					</div>
					<div class="room-grid">
						<div
							class="room-card"
							data-room="public"
						>
							<div class="room-icon">🏠</div>
							<h3>public</h3>
							<p>Join this room to start working</p>
							<button class="join-room-btn">Join Room</button>
						</div>
						<div
							class="room-card"
							data-room="super-duper"
						>
							<div class="room-icon">🏠</div>
							<h3>super-duper</h3>
							<p>Join this room to start working</p>
							<button class="join-room-btn">Join Room</button>
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
		// Always start fresh since we tear down completely when leaving
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
			this.visualization = new GraphVisualization(this.connection);
			const result = this.visualization.init('cy');

			// Apply the currently selected layout
			const layoutSelect = document.querySelector('#layoutSelect');
			if (layoutSelect && this.visualization.isInitialized()) {
				const selectedLayout = layoutSelect.value;
				// Apply the selected layout after a short delay to ensure visualization is ready
				setTimeout(() => {
					if (this.visualization && this.visualization.cy) {
						this.visualization.cy
							.layout({ name: selectedLayout, animate: false })
							.run();
					}
				}, 300);
			}
		};

		// Start the initialization process
		initVisualization();
	}

	// Room operations - these are now just UI state updates
	// The actual room joining is handled by external services
	joinRoom(roomName) {
		// Don't change UI state here - wait for state change event
		// Just dispatch the event for external handling
		document.dispatchEvent(
			new CustomEvent('ui:joinRoom', {
				detail: roomName,
			})
		);
	}

	leaveRoom() {
		this.currentRoom = null;

		// Completely tear down visualization when leaving a room
		if (this.visualization && this.visualization.isInitialized()) {
			this.visualization.destroy();
			this.visualization = null;
		}

		this.showRoomSelectionMode();

		// Dispatch event for external handling
		document.dispatchEvent(new CustomEvent('room:left'));
	}

	// Node operations
	handleAddNode() {
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
			label: nodeLabel || 'Unnamed Node',
			props: props,
		};

		if (nodeId) {
			nodeData.id = nodeId;
		}

		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('node:create', {
				detail: { room: this.currentRoom, data: nodeData },
			})
		);
	}

	handleDeleteNode() {
		const nodeId = this.container.left
			.querySelector('#nodeId')
			.value.trim();
		if (!nodeId) return;

		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('node:delete', {
				detail: { room: this.currentRoom, id: nodeId },
			})
		);
	}

	// Edge operations
	handleAddEdge() {
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
			label: edgeLabel || 'Unnamed Edge',
			direction: edgeDirection,
			props: props,
		};

		if (edgeId) {
			edgeData.id = edgeId;
		}

		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('edge:create', {
				detail: { room: this.currentRoom, data: edgeData },
			})
		);
	}

	handleDeleteEdge() {
		const edgeId = this.container.left
			.querySelector('#edgeId')
			.value.trim();
		if (!edgeId) return;

		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('edge:delete', {
				detail: { room: this.currentRoom, id: edgeId },
			})
		);
	}

	// Import/Export
	handleExport() {
		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('graph:export', {
				detail: { room: this.currentRoom },
			})
		);
	}

	handleImport(event) {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = JSON.parse(e.target.result);
				// Dispatch event for external handling
				document.dispatchEvent(
					new CustomEvent('graph:import', {
						detail: { room: this.currentRoom, data: data },
					})
				);
			} catch (error) {
				console.error('Failed to parse import file:', error);
			}
		};
		reader.readAsText(file);
	}

	handleClearLocal() {
		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('graph:clearLocal', {
				detail: { room: this.currentRoom },
			})
		);
	}

	// Graph operations
	handleSearch(query) {
		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('graph:search', {
				detail: { room: this.currentRoom, query: query },
			})
		);
	}

	handleClearSearch() {
		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('graph:clearSearch', {
				detail: { room: this.currentRoom },
			})
		);
	}

	handleLayoutChange(layout) {
		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('graph:layoutChange', {
				detail: { room: this.currentRoom, layout: layout },
			})
		);
	}

	handleFitGraph() {
		// Dispatch event for external handling
		document.dispatchEvent(
			new CustomEvent('graph:fit', {
				detail: { room: this.currentRoom },
			})
		);
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
}
