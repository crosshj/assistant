import { $ } from '../_lib/utils.js';

// PropsManager Component - Handles loading and displaying props data
export class PropsService {
	constructor() {
		this.setupEventListeners();
		this.isLoading = false;
	}

	setupEventListeners() {
		// Listen for props loaded events
		document.addEventListener('graph:propsLoaded', (e) => {
			this.handlePropsLoaded(e.detail);
		});

		// Listen for selection changes to auto-load props
		document.addEventListener('selectionChanged', (e) => {
			this.handleSelectionChanged(e.detail);
		});
	}

	// Handle selection changes and auto-load props
	handleSelectionChanged(detail) {
		const { elementId, elementType, room } = detail;
		if (!elementId || !elementType || !room) {
			return;
		}

		// Clear the props field immediately to show loading state
		this.clearPropsField(elementType);

		// Show loading spinner
		this.showLoading(true);

		// Request props from GunDB

		document.dispatchEvent(
			new CustomEvent('graph:requestProps', {
				detail: {
					elementId,
					elementType,
					room,
				},
			})
		);
	}

	// Clear the appropriate props field
	clearPropsField(elementType) {
		if (elementType === 'node') {
			const nodePropsField = $('nodeProps');
			if (nodePropsField) {
				nodePropsField.value = '';
			}
		} else if (elementType === 'edge') {
			const edgePropsField = $('edgeProps');
			if (edgePropsField) {
				edgePropsField.value = '';
			}
		}
	}

	// Show/hide loading spinner
	showLoading(show) {
		this.isLoading = show;

		// Update the "New node" section
		const nodePropsField = $('nodeProps');
		if (nodePropsField) {
			if (show) {
				nodePropsField.placeholder = 'Loading props...';
				nodePropsField.disabled = true;
			} else {
				nodePropsField.placeholder = 'Props (JSON object)';
				nodePropsField.disabled = false;
			}
		}

		// Update the "New edge" section
		const edgePropsField = $('edgeProps');
		if (edgePropsField) {
			if (show) {
				edgePropsField.placeholder = 'Loading props...';
				edgePropsField.disabled = true;
			} else {
				edgePropsField.placeholder = 'Props (JSON object)';
				edgePropsField.disabled = false;
			}
		}
	}

	// Handle props loaded event
	handlePropsLoaded(detail) {
		const { elementId, elementType, props, room } = detail;
		if (!elementId || !elementType || !props) {
			return;
		}

		try {
			// Clean the props data
			const safeProps = this.extractSafeProps(props);

			// Update the form fields with the loaded props
			if (elementType === 'node') {
				const nodePropsField = $('nodeProps');
				if (nodePropsField) {
					nodePropsField.value = JSON.stringify(safeProps, null, 2);
				}
			} else if (elementType === 'edge') {
				const edgePropsField = $('edgeProps');
				if (edgePropsField) {
					edgePropsField.value = JSON.stringify(safeProps, null, 2);
				}
			}

			// Hide loading spinner
			this.showLoading(false);
		} catch (error) {
			console.error(
				'❌ PropsManager: Error handling props loaded:',
				error
			);
			this.showLoading(false);
		}
	}

	// Extract safe, serializable data from GunDB objects
	extractSafeProps(gunObj) {
		// EventCoordinator now sends clean props, so just return them
		return gunObj || {};
	}
}
