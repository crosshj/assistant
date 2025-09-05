import { html } from '../_lib/utils.js';
import './FileTree.css';

export class FileTree {
	constructor() {
		this.container = null;
		this.render();
	}

	render() {
		// Find the filetree container
		this.container = document.getElementById('filetree-container');
		if (!this.container) {
			throw new Error('FileTree container not found');
		}

		// Create basic filetree placeholder
		this.container.innerHTML = html`
			<div class="file-tree">
				<p>Documents list placeholder</p>
			</div>
		`;
	}
}
