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
		}
		.sidebar-header strong {
			margin: 0;
			font-size: 1.2rem;
			color: var(--text-primary);
		}
		.sidebar-content {
		}
		.toggle-btn {
			padding: 0.25rem 0.5rem;
			border: none;
			border-radius: 12px;
			background: var(--card-bg);
			color: var(--text-primary);
			cursor: pointer;
			font-size: 0.8rem;
			font-weight: normal;
		}
		.toggle-btn:hover {
			background: var(--hover-bg);
		}
		.component-container {
			flex: 1;
			overflow: hidden;
		}
		.hidden {
			display: none;
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
	</div>
`;
