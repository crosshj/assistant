import { html } from '../_lib/utils.js';

/**
 * Layout Component
 * Creates the main application grid layout
 */
export class Layout {
	constructor() {}

	render(parentElement) {
		parentElement.innerHTML = LayoutBeta;
	}

	toggleView() {
		const filetreeContainer = document.getElementById('filetree-container');
		const graphviewContainer = document.getElementById(
			'graphview-container'
		);
		const headerTitle = document.querySelector('.sidebar-header strong');

		// Toggle visibility
		filetreeContainer.classList.toggle('hidden');
		graphviewContainer.classList.toggle('hidden');

		// Update header title based on what's now visible
		if (filetreeContainer.classList.contains('hidden')) {
			headerTitle.textContent = 'Graph';
		} else {
			headerTitle.textContent = 'Documents';
		}
	}

	showRoomState() {
		const sidebarPane = document.getElementById('sidebar-pane');
		const documentPane = document.getElementById('document-pane');
		const roomStateContainer = document.getElementById(
			'room-state-container'
		);

		// Hide main panes
		sidebarPane.classList.add('hidden');
		documentPane.classList.add('hidden');

		// Show room state container
		roomStateContainer.classList.remove('hidden');
	}

	hideRoomState() {
		const sidebarPane = document.getElementById('sidebar-pane');
		const documentPane = document.getElementById('document-pane');
		const roomStateContainer = document.getElementById(
			'room-state-container'
		);

		// Show main panes
		sidebarPane.classList.remove('hidden');
		documentPane.classList.remove('hidden');

		// Hide room state container
		roomStateContainer.classList.add('hidden');
	}

	showLoadingSpinner() {
		const roomStateContainer = document.getElementById(
			'room-state-container'
		);
		roomStateContainer.innerHTML = html`
			<div class="loading-spinner">
				<div class="spinner"></div>
			</div>
		`;
	}

	showRoomList() {
		const roomStateContainer = document.getElementById(
			'room-state-container'
		);
		roomStateContainer.innerHTML = html`
			<div class="room-list">
				<div class="room-list-header">
					<h2>Select a Room</h2>
					<p>Choose a room and start collaborating</p>
				</div>
				<div class="room-grid">
					<div
						class="room-card"
						data-room="public"
					>
						<div class="room-icon">🏠</div>
						<h3>public</h3>
						<p>Select this room to start working</p>
						<button class="join-room-btn">Select Room</button>
					</div>
					<div
						class="room-card"
						data-room="super-duper"
					>
						<div class="room-icon">🏠</div>
						<h3>super-duper</h3>
						<p>Select this room to start working</p>
						<button class="join-room-btn">Select Room</button>
					</div>
				</div>
			</div>
		`;
	}

	showBlank() {
		const roomStateContainer = document.getElementById(
			'room-state-container'
		);
		roomStateContainer.innerHTML = '';
	}
}

const LayoutAlpha = html`
	<style>
		:root {
			--side-column-width: 80px;
		}
		@media (max-width: 1200px) {
			:root {
				--side-column-width: 65px;
			}
		}
		@media (max-width: 900px) {
			:root {
				--side-column-width: 1fr;
			}
		}
		.grid {
			display: grid;
			grid-template-rows: auto 1fr;
			grid-template-columns: 50% 1fr;
			gap: var(--card-gap);
			padding: var(--card-gap);
			height: 100vh;
			overflow: hidden;
		}
		#header-container {
			grid-column: 1 / -1;
			height: 60px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 1rem;
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: var(--card-radius);
		}
		#sidebar-pane,
		#document-pane {
			height: 100%;
			max-height: 100%;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
		#sidebar-pane {
			grid-column: 1;
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: var(--card-radius);
			overflow: hidden;
		}
		#document-pane {
			grid-column: 2;
		}
		#sidebar-pane > *,
		#document-pane > * {
			max-height: 100%;
			overflow: hidden;
		}
	</style>
	<div
		class="grid"
		id="mainGrid"
	>
		<header id="header-container"></header>
		<div id="left-pane"></div>
		<div id="right-pane"></div>
	</div>
`;

const LayoutBeta = html`
	<style>
		:root {
			--side-column-width: 80px;
		}
		.grid {
			display: grid;
			grid-template-rows: auto 1fr;
			grid-template-columns: 50% 1fr;
			gap: var(--card-gap);
			padding: var(--card-gap);
			height: 100vh;
			overflow: hidden;
		}
		#header-container {
			grid-column: 1 / -1;
			height: 60px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 1rem;
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: var(--card-radius);
		}
		#sidebar-pane,
		#document-pane {
			height: 100%;
			max-height: 100%;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
		#sidebar-pane.hidden,
		#document-pane.hidden {
			display: none;
		}
		#sidebar-pane {
			grid-column: 1;
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: var(--card-radius);
			overflow: hidden;
			padding: 1rem;
		}
		#document-pane {
			grid-column: 2;
		}
		#sidebar-pane > *,
		#document-pane > * {
			max-height: 100%;
			overflow: hidden;
		}
		.sidebar-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 1rem;
		}
		.sidebar-header strong {
			margin: 0;
			font-size: 1.2rem;
			color: var(--text-primary);
		}
		.sidebar-content {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
		}
		.toggle-btn {
			background: transparent;
			color: var(--text-bright);
			border: 1px solid var(--card-border);
			padding: 0.5rem 1rem;
			border-radius: 8px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s ease;
		}
		.toggle-btn:hover {
			background: var(--card-border);
			border-color: var(--accent);
		}
		.component-container {
			flex: 1;
			overflow: hidden;
		}
		.hidden {
			display: none;
		}
		#room-state-container {
			grid-column: 1 / -1;
			height: 100%;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			background: var(--card-bg);
			border: 1px solid var(--card-border);
			border-radius: var(--card-radius);
		}
		.loading-spinner {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100%;
			width: 100%;
		}
		.spinner {
			width: 32px;
			height: 32px;
			border: 3px solid var(--card-border);
			border-top: 3px solid var(--accent);
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}
		@keyframes spin {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(360deg);
			}
		}
		.room-list {
			width: 100%;
			max-width: 600px;
			padding: 4rem 2rem 2rem 2rem;
			background: transparent;
			border: none;
		}
		.room-list-header {
			text-align: center;
			margin-bottom: 2rem;
		}
		.room-list-header h2 {
			margin: 0 0 0.5rem 0;
			color: var(--text-primary);
		}
		.room-list-header p {
			margin: 0;
			color: var(--text-secondary);
		}
		.room-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
			gap: 1rem;
		}
		.room-card {
			background: var(--card-bg);
			border: 2px solid var(--card-border);
			border-radius: var(--card-radius);
			padding: 2rem;
			text-align: center;
			transition: all 0.3s ease;
			cursor: pointer;
		}
		.room-card:hover {
			border-color: var(--accent);
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
		}
		.room-list .room-icon {
			font-size: 3rem;
			margin-bottom: 1rem;
		}
		.room-card h3 {
			font-size: 1.5rem;
			color: var(--text-bright);
			margin-bottom: 0.5rem;
		}
		.room-card p {
			color: var(--text-muted);
			margin-bottom: 1.5rem;
		}
		.join-room-btn {
			background: #2563eb;
			color: white;
			border: none;
			padding: 0.75rem 1.5rem;
			border-radius: 8px;
			font-size: 1rem;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s ease;
		}
		.join-room-btn:hover {
			background: color-mix(in srgb, var(--accent) 80%, white);
			transform: translateY(-1px);
		}
	</style>
	<div class="grid">
		<header id="header-container"></header>
		<div id="sidebar-pane">
			<div class="sidebar-header">
				<strong>Graph</strong>
				<button
					id="sidebar-toggle"
					class="toggle-btn"
				>
					Toggle
				</button>
			</div>
			<div class="sidebar-content">
				<div
					id="filetree-container"
					class="component-container hidden"
				></div>
				<div
					id="graphview-container"
					class="component-container"
				></div>
			</div>
		</div>
		<div id="document-pane"></div>
		<div
			id="room-state-container"
			class="hidden"
		>
			<!-- Room list or loading spinner will be shown here -->
		</div>
	</div>
`;
