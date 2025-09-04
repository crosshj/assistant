import { log, addEventListener, dispatchEvent } from '../_lib/utils.js';
import { DocumentEditor } from './DocumentEditor.js';

/**
 */
export class DocumentEditorController {
	constructor() {
		this.ui = new DocumentEditor();

		// Bind controller methods

		// Setup event listeners
		this.setupEventListeners();
	}

	setupEventListeners() {}

	setupUIEventDelegation() {}
}
