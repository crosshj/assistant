// PropsManager Component - Handles loading and displaying props data
export class PropsManager {
	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		// Listen for props data loaded events
		window.addEventListener('graph:propsLoaded', (e) => {
			console.log('🔍 PropsManager: Received props event:', e.detail);
			this.handlePropsLoaded(e.detail);
		});

		// Listen for manual props loading requests
		document.addEventListener('click', (e) => {
			if (e.target.id === 'loadProps') {
				this.loadPropsForSelected();
			}
		});
	}

	// Handle props loaded event
	handlePropsLoaded(detail) {
		const { elementId, elementType, props } = detail;
		console.log('🔍 PropsManager: Raw props from GunDB:', props);

		// Safely extract props data from GunDB object
		const safeProps = this.extractSafeProps(props);
		console.log('🔒 PropsManager: Cleaned props:', safeProps);

		// Update the "Selected" display with the loaded props
		const selElement = document.getElementById('sel');
		if (selElement) {
			try {
				// Parse the current display data
				const currentData = JSON.parse(selElement.textContent);
				const idField = elementType === 'node' ? 'nid' : 'eid';

				if (currentData && currentData[idField] === elementId) {
					// Create a NEW object with updated props to avoid reference issues
					const updatedData = {
						...currentData,
						props: safeProps,
					};

					selElement.textContent = JSON.stringify(
						updatedData,
						null,
						2
					);
					console.log('✅ PropsManager: UI updated successfully');
					console.log(
						'🔍 PropsManager: New UI content:',
						selElement.textContent
					);

					// Check if something overwrites our update
					setTimeout(() => {
						console.log(
							'🔍 PropsManager: UI content after 100ms:',
							selElement.textContent
						);
					}, 100);
				}
			} catch (error) {
				console.log(
					'❌ PropsManager: Error updating UI:',
					error.message
				);
			}
		}

		// Also update the appropriate form field
		const propsField = document.getElementById(
			elementType === 'node' ? 'nodeProps' : 'edgeProps'
		);
		if (propsField) {
			propsField.value = JSON.stringify(safeProps, null, 2);
		}
	}

	// Method to load props for the currently selected element
	loadPropsForSelected() {
		console.log('🔍 PropsManager: Starting props load...');

		const selElement = document.getElementById('sel');
		if (!selElement || !selElement.textContent) {
			console.log('❌ PropsManager: No selected element');
			return;
		}

		try {
			const data = JSON.parse(selElement.textContent);
			console.log(
				'🔍 PropsManager: Selected element:',
				data.nid || data.eid
			);

			// Check if we have a room context
			if (!window.currentRoom) {
				console.log('❌ PropsManager: No room context');
				return;
			}

			// Determine if this is a node or edge
			let elementId, elementType;
			if (data.nid) {
				elementId = data.nid;
				elementType = 'node';
			} else if (data.eid) {
				elementId = data.eid;
				elementType = 'edge';
			} else {
				console.log('❌ PropsManager: Cannot determine element type');
				return;
			}

			console.log(
				'🔍 PropsManager: Requesting props for',
				elementType,
				elementId
			);

			// Trigger the props loading event
			const event = new CustomEvent('graph:requestProps', {
				detail: {
					elementId,
					elementType,
					room: window.currentRoom,
				},
			});
			window.dispatchEvent(event);
		} catch (error) {
			console.log('❌ PropsManager: Error:', error.message);
		}
	}

	// Extract safe, serializable data from GunDB objects
	extractSafeProps(gunObj) {
		// EventCoordinator now sends clean props, so just return them
		return gunObj || {};
	}
}
