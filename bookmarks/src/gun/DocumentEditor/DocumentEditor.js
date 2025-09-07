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
					<strong class="section-header">Details</strong>
				</div>
				<div class="contents">
					<pre id="selection-display">No selection</pre>
				</div>
			</section>
		`;
	}

	updateSelection(selectionData) {
		const display = document.getElementById('selection-display');
		if (!display) return;

		if (!selectionData?.elementType) {
			display.textContent = 'No selection';
			return;
		}

		const { elementType, elementId, label, props, from, to, direction } =
			selectionData;

		const lines = [
			`Selected: ${elementType === 'node' ? 'Node' : 'Edge'}`,
			`ID: ${elementId || 'N/A'}`,
		];

		if (!props) {
			display.textContent = lines.join('\n\n');
			return;
		}

		lines.push(`Label: ${label || 'N/A'}`);

		if (elementType === 'edge') {
			lines.push(`Direction: ${direction || 'N/A'}`);
			lines.push(`From: ${from || 'N/A'}`);
			lines.push(`To: ${to || 'N/A'}`);
		}

		lines.push(`Props: ${props ? JSON.stringify(props, null, 2) : '{}'}`);

		display.textContent = lines.join('\n\n');
	}
}
