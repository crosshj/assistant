import { html } from '../_lib/utils.js';
import './GraphView.css';

export class GraphView {
	constructor() {
		this.container = null;
		this.render();
	}

	render() {
		// Find the graphview container
		this.container = document.getElementById('graphview-container');
		if (!this.container) {
			throw new Error('GraphView container not found');
		}

		// Create basic graphview placeholder
		this.container.innerHTML = html`
			<div class="graph-view">
				<p>Graph placeholder</p>
			</div>
		`;
	}
}
