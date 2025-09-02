import './Layout.css';

/**
 * Layout Component
 * Creates the main application grid layout
 */
export class Layout {
	render(parentElement) {
		parentElement.innerHTML = `
			<div class="grid" id="mainGrid">
				<header id="header-container"></header>
				<div id="left-pane"></div>
				<div id="right-pane"></div>
			</div>
		`;

		return {
			header: document.getElementById('header-container'),
			leftPane: document.getElementById('left-pane'),
			rightPane: document.getElementById('right-pane'),
			mainGrid: document.getElementById('mainGrid'),
		};
	}
}
