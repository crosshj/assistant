import { html } from '../_lib/utils.js';
import './DocumentEditor.css';

export class DocumentEditor {
	constructor() {
		this.container = null;
		this.currentSelection = null;
		this.render();
	}

	render() {
		// Find the document pane container
		this.container = document.getElementById('document-pane');
		if (!this.container) {
			throw new Error('Document pane container not found');
		}

		// Create document editor with its own header and chrome
		this.container.innerHTML = html`
			<section class="card document-panel">
				<div class="document-header">
					<strong class="section-header">Document Details</strong>
				</div>
				<div class="contents">
					<pre id="selection-display">No selection</pre>
				</div>
			</section>
		`;
	}

	updateSelection(selectionData) {
		this.currentSelection = selectionData;
		this.renderSelection();
	}

	renderSelection() {
		const display = document.getElementById('selection-display');
		if (!display) return;

		if (!this.currentSelection) {
			display.textContent = 'No selection';
			return;
		}

		const { elementType, elementId, label, props, from, to, direction } =
			this.currentSelection;

		let content = '';

		if (elementType === 'node') {
			content = `Selected: Node
ID: ${elementId || 'N/A'}

Label: ${label || 'N/A'}

Props: ${props ? JSON.stringify(props, null, 2) : 'Loading...'}`;
		} else if (elementType === 'edge') {
			content = `Selected: Edge
            
ID: ${elementId || 'N/A'}

From: ${from || 'N/A'}
To: ${to || 'N/A'}

Label: ${label || 'N/A'}

Direction: ${direction || 'N/A'}

Props: ${props ? JSON.stringify(props, null, 2) : 'Loading...'}`;
		} else {
			content = 'No selection';
		}

		display.textContent = content;
	}
}
