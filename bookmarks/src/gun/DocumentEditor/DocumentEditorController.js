import { log, addEventListener, dispatchEvent } from '../_lib/utils.js';
import { DocumentEditor } from './DocumentEditor.js';

/**
 * DocumentEditorController
 * Handles document editing functionality and UI events
 */
export class DocumentEditorController {
	constructor() {
		// Create DocumentEditor component
		try {
			this.ui = new DocumentEditor();
		} catch (error) {
			console.warn('Failed to initialize DocumentEditor UI:', error);
			return;
		}

		// Setup event listeners
		this.setupEventListeners();
	}

	setupEventListeners() {
		// Listen to graph selection events
		addEventListener('graph:select', (event) =>
			this.ui.updateSelection(event.detail)
		);
		addEventListener('graph:propsLoaded', (event) =>
			this.ui.updateSelection(event.detail)
		);
		addEventListener('room:left', () => this.ui.updateSelection());
		addEventListener('network:disconnected', () =>
			this.ui.updateSelection()
		);
	}
}
