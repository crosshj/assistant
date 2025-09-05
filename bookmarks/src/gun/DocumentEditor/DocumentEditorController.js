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

		// Bind event handlers
		this.handleGraphSelect = this.handleGraphSelect.bind(this);
		this.handlePropsLoaded = this.handlePropsLoaded.bind(this);

		// Setup event listeners
		this.setupEventListeners();
	}

	setupEventListeners() {
		// Listen to graph selection events
		addEventListener('graph:select', this.handleGraphSelect);
		addEventListener('graph:propsLoaded', this.handlePropsLoaded);
	}

	handleGraphSelect(event) {
		const { elementId, elementType, room } = event.detail;

		if (!elementId || !elementType) {
			// Clear selection
			this.ui.updateSelection(null);
			return;
		}

		// Update selection with basic info (props will come later)
		this.ui.updateSelection({
			elementType,
			elementId,
			room,
			props: null, // Will be updated when props load
		});
	}

	handlePropsLoaded(event) {
		const { elementId, elementType, props, room } = event.detail;

		if (!elementId || !elementType) return;

		// Update current selection with loaded props
		const currentSelection = this.ui.currentSelection;
		if (
			currentSelection &&
			currentSelection.elementId === elementId &&
			currentSelection.elementType === elementType
		) {
			// Update with props
			this.ui.updateSelection({
				...currentSelection,
				props: props,
			});
		}
	}
}
