import { html } from '../_lib/utils.js';
import './DocumentEditor.css';

export class DocumentEditor {
	constructor() {
		this.container = null;
		this.render();
	}

	render() {
		// Find the document pane container
		this.container = document.getElementById('document-pane');
		if (!this.container) {
			throw new Error('Document pane container not found');
		}

		// Create basic document editor placeholder
		this.container.innerHTML = html`
			<div class="document-editor">
				<h2>Document Editor</h2>
				<p>Document editor placeholder</p>
			</div>
		`;
	}
}
