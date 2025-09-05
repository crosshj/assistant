import { html } from '../_lib/utils.js';

/**
 * Layout Component
 * Creates the main application grid layout
 */
export class Layout {
	render(parentElement) {
		parentElement.innerHTML = LayoutBeta;
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
	<div class="grid">
		<header id="header-container"></header>
		<div id="sidebar-pane"></div>
		<div id="document-pane"></div>
	</div>
`;
