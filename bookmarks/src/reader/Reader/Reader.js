import { html } from '../_lib/utils.js';
import './Reader.css';

export class Reader {
	constructor(controller) {
		this.controller = controller;
		this.container = document.createElement('div');
		this.container.classList.add('reader-container');
		document.body.appendChild(this.container);
		this.currentState = null;
		this.currentSchema = null;
		this.render();
	}

	render() {
		this.container.innerHTML = html`
			<header class="reader-header">
				<div class="header-left">
					<button
						id="hamburger-menu"
						class="hamburger-btn"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<line
								x1="3"
								y1="6"
								x2="21"
								y2="6"
							></line>
							<line
								x1="3"
								y1="12"
								x2="21"
								y2="12"
							></line>
							<line
								x1="3"
								y1="18"
								x2="21"
								y2="18"
							></line>
						</svg>
					</button>
					<h1 id="app-title">Reader</h1>
				</div>
			</header>
			<div class="reader-content">
				<div class="reader-loading">
					<div class="loading-spinner"></div>
					<p>Loading...</p>
				</div>
			</div>
		`;
	}

	showContent() {
		// Hide header actions when showing splash screen
		this.hideHeaderActions();

		// Refresh sidebar to hide edit metadata option
		this.refreshSidebarContent();

		const content = this.container.querySelector('.reader-content');
		content.innerHTML = html`
			<div class="splash-container">
				<div class="splash-content">
					<div class="splash-icon">
						<svg
							width="64"
							height="64"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path
								d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
							></path>
							<polyline points="14,2 14,8 20,8"></polyline>
							<line
								x1="16"
								y1="13"
								x2="8"
								y2="13"
							></line>
							<line
								x1="16"
								y1="17"
								x2="8"
								y2="17"
							></line>
							<polyline points="10,9 9,9 8,9"></polyline>
						</svg>
					</div>
					<h2 class="splash-title">Welcome to Reader</h2>
					<p class="splash-description">
						Create or open a .smartText database file to get started
						with your data management.
					</p>
					<div class="splash-actions">
						<button
							id="test-file-picker"
							class="splash-btn primary"
						>
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
								></path>
								<polyline points="14,2 14,8 20,8"></polyline>
							</svg>
							Open Existing File
						</button>
						<button
							id="test-create-file"
							class="splash-btn secondary"
						>
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<line
									x1="12"
									y1="5"
									x2="12"
									y2="19"
								></line>
								<line
									x1="5"
									y1="12"
									x2="19"
									y2="12"
								></line>
							</svg>
							Create New File
						</button>
					</div>
					<div class="splash-features">
						<div class="feature">
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"
								></path>
								<rect
									x="9"
									y="11"
									width="6"
									height="11"
								></rect>
								<path d="M9 7h6v4H9z"></path>
							</svg>
							<span>Dynamic UI Generation</span>
						</div>
						<div class="feature">
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<rect
									x="2"
									y="3"
									width="20"
									height="14"
									rx="2"
									ry="2"
								></rect>
								<line
									x1="8"
									y1="21"
									x2="16"
									y2="21"
								></line>
								<line
									x1="12"
									y1="17"
									x2="12"
									y2="21"
								></line>
							</svg>
							<span>SQLite Database</span>
						</div>
						<div class="feature">
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
								></path>
								<polyline
									points="3.27,6.96 12,12.01 20.73,6.96"
								></polyline>
								<line
									x1="12"
									y1="22.08"
									x2="12"
									y2="12"
								></line>
							</svg>
							<span>Schema-Driven</span>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	showDatabaseState({ action, state, metadata, message }) {
		// Store current state and schema for editing
		this.currentState = state;
		this.currentSchema = metadata?.schema;

		// Update header title if we have a schema with title
		if (metadata?.schema?.title) {
			this.updateHeaderTitle(metadata.schema.title);
		}

		// Generate dynamic UI if we have metadata
		if (metadata && metadata.schema) {
			this.showDynamicUI(metadata.schema, state);
			// Update header title again after showDynamicUI might have re-rendered the header
			if (metadata?.schema?.title) {
				this.updateHeaderTitle(metadata.schema.title);
			}
		}
	}

	updateHeaderTitle(title) {
		const titleElement = this.container.querySelector('#app-title');
		if (titleElement) {
			titleElement.textContent = title;
		}
	}

	showDynamicUI(schema, state) {
		const content = this.container.querySelector('.reader-content');

		// Show header actions when database is loaded
		this.showHeaderActions();

		// Refresh sidebar to show edit metadata option
		this.refreshSidebarContent();

		// Generate UI based on schema type
		let uiContent;
		if (schema.type === 'list') {
			uiContent = this.generateListUI(schema, state);
		} else {
			uiContent = html` <p>Unsupported schema type: ${schema.type}</p> `;
		}

		content.innerHTML = html`
			<div class="dynamic-ui-pane">
				<div
					id="dynamic-ui-content"
					class="dynamic-ui-content"
				>
					${uiContent}
				</div>
			</div>
		`;
	}

	showHeaderActions() {
		const header = this.container.querySelector('.reader-header');
		if (header && !header.querySelector('.header-actions')) {
			header.innerHTML = html`
				<div class="header-left">
					<button
						id="hamburger-menu"
						class="hamburger-btn"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<line
								x1="3"
								y1="6"
								x2="21"
								y2="6"
							></line>
							<line
								x1="3"
								y1="12"
								x2="21"
								y2="12"
							></line>
							<line
								x1="3"
								y1="18"
								x2="21"
								y2="18"
							></line>
						</svg>
					</button>
					<h1 id="app-title">Reader</h1>
				</div>
				<div class="header-right">
					<button
						id="selected-edit-btn"
						class="selected-edit-btn"
						style="display: none;"
						title="Edit Selected Item"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
							></path>
							<path
								d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
							></path>
						</svg>
					</button>
				</div>
			`;
		}
	}

	hideHeaderActions() {
		const header = this.container.querySelector('.reader-header');
		if (header) {
			header.innerHTML = html`
				<div class="header-left">
					<button
						id="hamburger-menu"
						class="hamburger-btn"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<line
								x1="3"
								y1="6"
								x2="21"
								y2="6"
							></line>
							<line
								x1="3"
								y1="12"
								x2="21"
								y2="12"
							></line>
							<line
								x1="3"
								y1="18"
								x2="21"
								y2="18"
							></line>
						</svg>
					</button>
					<h1 id="app-title">Reader</h1>
				</div>
			`;
		}
	}

	showSelectedEditButton() {
		const editBtn = this.container.querySelector('#selected-edit-btn');
		if (
			editBtn &&
			this.currentSchema?.controls?.includes('selected-edit')
		) {
			editBtn.style.display = 'flex';
		}
	}

	hideSelectedEditButton() {
		const editBtn = this.container.querySelector('#selected-edit-btn');
		if (editBtn) {
			editBtn.style.display = 'none';
		}
	}

	showSelectedEditModal(itemId = null) {
		// Hide hamburger menu first
		this.hideHamburgerMenu();

		// Get the item to edit (either passed itemId or selected item)
		const selectedItem = itemId
			? this.getItemById(itemId)
			: this.controller.selectedRowId
			? this.getItemById(this.controller.selectedRowId)
			: null;

		// For add mode, we don't need an existing item
		const isAddMode = !itemId && !this.controller.selectedRowId;

		// Create modal overlay
		const modal = document.createElement('div');
		modal.className = 'selected-edit-modal-overlay';
		modal.innerHTML = html`
			<div class="selected-edit-modal">
				<div class="modal-header">
					<h3>${isAddMode ? 'Add Item' : 'Edit Item'}</h3>
					<button
						id="close-selected-edit-modal"
						class="close-btn"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<line
								x1="18"
								y1="6"
								x2="6"
								y2="18"
							></line>
							<line
								x1="6"
								y1="6"
								x2="18"
								y2="18"
							></line>
						</svg>
					</button>
				</div>
				<form
					id="selected-edit-form"
					class="modal-content"
				>
					${!isAddMode
						? html`
								<input
									type="hidden"
									name="id"
									value="${selectedItem?.id || ''}"
								/>
						  `
						: ''}
					${this.currentSchema?.fields
						?.filter((field) => field.name !== 'id') // Exclude ID field from form
						?.map(
							(field) => html`
								<div class="form-field">
									<label for="selected-edit-${field.name}"
										>${field.displayName ||
										field.name}</label
									>
									${this.generateFieldInputForModal(
										field,
										selectedItem || {}
									)}
								</div>
							`
						)
						.join('') || ''}
					<div class="modal-actions">
						<button
							type="button"
							id="cancel-selected-edit"
							class="btn btn-secondary"
						>
							Cancel
						</button>
						<button
							type="submit"
							id="save-selected-edit"
							class="btn btn-primary"
						>
							Save Changes
						</button>
					</div>
				</form>
			</div>
		`;

		// Add modal to DOM
		this.container.appendChild(modal);

		// Show modal with animation
		requestAnimationFrame(() => {
			modal.style.opacity = '1';
			modal.style.visibility = 'visible';
		});
	}

	hideSelectedEditModal() {
		const modal = this.container.querySelector(
			'.selected-edit-modal-overlay'
		);
		if (modal) {
			modal.style.opacity = '0';
			modal.style.visibility = 'hidden';
			setTimeout(() => {
				modal.remove();
			}, 300);
		}
	}

	handleSelectedEditFormSubmit(form) {
		const formData = new FormData(form);
		const data = {};

		// Extract form data
		for (const [key, value] of formData.entries()) {
			data[key] = value;
		}

		// Get the item ID (if present)
		const itemId = data.id;

		if (itemId) {
			// Edit mode: Remove ID from data object before sending to controller
			delete data.id;
			// Dispatch update event
			this.controller.dispatchUpdateData(data, itemId);
		} else {
			// Add mode: Insert new item
			this.controller.dispatchInsertData(data);
		}

		// Hide modal
		this.hideSelectedEditModal();

		// Clear selection
		this.controller.selectedRowId = null;
		this.hideSelectedEditButton();
	}

	toggleHamburgerMenu() {
		const overlay = this.container.querySelector('.sidebar-overlay');
		if (overlay) {
			overlay.classList.toggle('show');
		} else {
			this.createHamburgerMenu();
			// Small delay to ensure DOM is ready for animation
			setTimeout(() => {
				const newOverlay =
					this.container.querySelector('.sidebar-overlay');
				if (newOverlay) {
					newOverlay.classList.add('show');
				}
			}, 10);
		}
	}

	createHamburgerMenu() {
		const container = this.container;
		if (!container.querySelector('.sidebar-overlay')) {
			const overlay = document.createElement('div');
			overlay.className = 'sidebar-overlay';

			const sidebar = document.createElement('div');
			sidebar.className = 'sidebar-menu';
			sidebar.innerHTML = this.generateSidebarContent();

			overlay.appendChild(sidebar);
			container.appendChild(overlay);
		}
	}

	generateSidebarContent() {
		const hasDatabase = this.currentSchema && this.currentState;

		return html`
			<div class="sidebar-header">
				<button
					id="close-sidebar"
					class="close-btn"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line
							x1="18"
							y1="6"
							x2="6"
							y2="18"
						></line>
						<line
							x1="6"
							y1="6"
							x2="18"
							y2="18"
						></line>
					</svg>
				</button>
			</div>
			<div class="sidebar-content">
				<button
					id="menu-open-file"
					class="menu-item"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
						></path>
						<polyline points="14,2 14,8 20,8"></polyline>
					</svg>
					<span>Open Database</span>
				</button>
				<button
					id="menu-create-file"
					class="menu-item"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line
							x1="12"
							y1="5"
							x2="12"
							y2="19"
						></line>
						<line
							x1="5"
							y1="12"
							x2="19"
							y2="12"
						></line>
					</svg>
					<span>Create New Database</span>
				</button>
				${hasDatabase
					? html`
							<button
								id="menu-edit-metadata"
								class="menu-item"
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
									></path>
									<path
										d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
									></path>
								</svg>
								<span>Edit Database Info</span>
							</button>
					  `
					: ''}
			</div>
		`;
	}

	hideHamburgerMenu() {
		const overlay = this.container.querySelector('.sidebar-overlay');
		if (overlay) {
			overlay.classList.remove('show');
		}
	}

	refreshSidebarContent() {
		const sidebar = this.container.querySelector('.sidebar-menu');
		if (sidebar) {
			sidebar.innerHTML = this.generateSidebarContent();
		}
	}

	showMetadataEditForm() {
		// Hide hamburger menu first
		this.hideHamburgerMenu();

		// Create modal overlay
		const modal = document.createElement('div');
		modal.className = 'metadata-modal-overlay';
		modal.innerHTML = html`
			<div class="metadata-modal">
				<div class="modal-header">
					<h3>Edit Database Information</h3>
					<button
						id="close-metadata-modal"
						class="close-btn"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<line
								x1="18"
								y1="6"
								x2="6"
								y2="18"
							></line>
							<line
								x1="6"
								y1="6"
								x2="18"
								y2="18"
							></line>
						</svg>
					</button>
				</div>
				<form
					id="metadata-form"
					class="modal-content"
				>
					<div class="form-field">
						<label for="database-title">Database Title</label>
						<input
							type="text"
							id="database-title"
							name="title"
							value="${this.currentSchema?.title ||
							'My Database'}"
							placeholder="Enter database title"
						/>
					</div>
					<div class="form-field">
						<label for="database-description"
							>Description (optional)</label
						>
						<textarea
							id="database-description"
							name="description"
							placeholder="Enter database description"
							rows="3"
						>
${this.currentSchema?.description || ''}</textarea
						>
					</div>

					<div class="form-field">
						<label>Fields Configuration</label>
						<div id="fields-container">
							${this.generateFieldsConfig()}
						</div>
						<button
							type="button"
							id="add-field-btn"
							class="action-btn secondary"
							style="margin-top: 0.5rem;"
						>
							+ Add Field
						</button>
					</div>

					<div class="form-field">
						<label>Actions Configuration</label>
						<div class="controls-config">
							<label class="control-option">
								<input
									type="checkbox"
									name="control-add"
									${this.currentSchema?.controls?.includes(
										'add'
									)
										? 'checked'
										: ''}
								/>
								Add Items
							</label>
							<label class="control-option">
								<input
									type="checkbox"
									name="control-edit"
									${this.currentSchema?.controls?.includes(
										'edit'
									)
										? 'checked'
										: ''}
								/>
								Edit Items
							</label>
							<label class="control-option">
								<input
									type="checkbox"
									name="control-delete"
									${this.currentSchema?.controls?.includes(
										'delete'
									)
										? 'checked'
										: ''}
								/>
								Delete Items
							</label>
							<label class="control-option">
								<input
									type="checkbox"
									name="control-bulk-upsert"
									${this.currentSchema?.controls?.includes(
										'bulk-upsert'
									)
										? 'checked'
										: ''}
								/>
								Bulk Upsert
							</label>
							<label class="control-option">
								<input
									type="checkbox"
									name="control-selected-edit"
									${this.currentSchema?.controls?.includes(
										'selected-edit'
									)
										? 'checked'
										: ''}
								/>
								Selected Edit (Header Icon)
							</label>
							<label class="control-option">
								<input
									type="checkbox"
									name="show-headers"
									${this.currentSchema?.showHeaders !== false
										? 'checked'
										: ''}
								/>
								Show Headers
							</label>
						</div>
					</div>
					<div class="modal-actions">
						<button
							type="button"
							id="cancel-metadata"
							class="action-btn secondary"
						>
							Cancel
						</button>
						<button
							type="submit"
							id="save-metadata"
							class="action-btn primary"
						>
							Save Changes
						</button>
					</div>
				</form>
			</div>
		`;

		this.container.appendChild(modal);

		// Add event listeners to the modal
		modal.addEventListener('click', (e) => {
			if (e.target.matches('#add-field-btn')) {
				this.addField();
			}
			if (e.target.matches('.remove-field-btn')) {
				const index = e.target.dataset.index;
				this.removeField(index);
			}
		});

		// Show modal with animation
		setTimeout(() => {
			modal.classList.add('show');
		}, 10);
	}

	hideMetadataEditForm() {
		const modal = this.container.querySelector('.metadata-modal-overlay');
		if (modal) {
			modal.classList.remove('show');
			setTimeout(() => {
				modal.remove();
			}, 300);
		}
	}

	showBulkUpsertModal() {
		const modal = document.createElement('div');
		modal.className = 'bulk-upsert-modal-overlay';
		modal.innerHTML = html`
			<div class="bulk-upsert-modal">
				<div class="modal-header">
					<h3>Bulk Upsert Data</h3>
					<button
						id="close-bulk-upsert-modal"
						class="close-btn"
					>
						&times;
					</button>
				</div>
				<div class="modal-content">
					<p>Paste your data in the format: <code>id - name</code></p>
					<textarea
						id="bulk-upsert-data"
						placeholder="Paste your data here..."
						rows="15"
						style="width: 100%; margin: 1rem 0; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 12px;"
					></textarea>
				</div>
				<div class="modal-actions">
					<button
						id="cancel-bulk-upsert"
						class="action-btn secondary"
					>
						Cancel
					</button>
					<button
						id="process-bulk-upsert"
						class="action-btn primary"
					>
						Process Data
					</button>
				</div>
			</div>
		`;

		this.container.appendChild(modal);

		// Add event listeners
		modal
			.querySelector('#close-bulk-upsert-modal')
			.addEventListener('click', () => {
				this.hideBulkUpsertModal();
			});

		modal
			.querySelector('#cancel-bulk-upsert')
			.addEventListener('click', () => {
				this.hideBulkUpsertModal();
			});

		modal
			.querySelector('#process-bulk-upsert')
			.addEventListener('click', () => {
				this.handleBulkUpsertSubmit();
			});
	}

	hideBulkUpsertModal() {
		const modal = this.container.querySelector(
			'.bulk-upsert-modal-overlay'
		);
		if (modal) {
			modal.remove();
		}
	}

	handleBulkUpsertSubmit() {
		const textarea = document.querySelector('#bulk-upsert-data');
		const data = textarea.value.trim();

		if (!data) {
			alert('Please enter some data to process.');
			return;
		}

		// Parse the data into the format expected by bulkUpsert
		const items = data
			.split('\n')
			.filter((line) => line.trim())
			.map((line) => {
				const match = line.match(/^(\d+)\s*-\s*(.+)$/);
				if (match) {
					const [, id, name] = match;
					return {
						id: parseInt(id),
						text: name.trim(),
						status: 'Todo',
					};
				}
				return null;
			})
			.filter((item) => item !== null);

		if (items.length === 0) {
			alert('No valid data found. Please use the format: id - name');
			return;
		}

		// Dispatch the bulk upsert event
		this.controller.dispatchBulkUpsert(items);
		this.hideBulkUpsertModal();
	}

	// TEMPORARY: Bulk Status Edit Modal
	/*
	showBulkStatusEditModal() {
		const statusField = this.currentSchema?.fields?.find(
			(f) => f.name === 'status' && f.type === 'enum'
		);
		if (!statusField) {
			alert('No status enum field found');
			return;
		}

		const modal = document.createElement('div');
		modal.className = 'bulk-status-edit-modal-overlay';
		modal.innerHTML = html`
			<div class="bulk-status-edit-modal">
				<div class="modal-header">
					<h3>Bulk Status Edit</h3>
					<button
						id="close-bulk-status-edit-modal"
						class="close-btn"
					>
						×
					</button>
				</div>
				<div class="modal-content">
					<p>Set status for all items to:</p>
					<select id="bulk-status-select">
						<option value="">Select status...</option>
						${statusField.options
							?.map(
								(option) => html`
									<option value="${option}">${option}</option>
								`
							)
							.join('') || ''}
					</select>
				</div>
				<div class="modal-actions">
					<button
						id="cancel-bulk-status-edit"
						class="action-btn secondary"
					>
						Cancel
					</button>
					<button
						id="apply-bulk-status-edit"
						class="action-btn primary"
					>
						Apply to All
					</button>
				</div>
			</div>
		`;

		this.container.appendChild(modal);

		modal
			.querySelector('#close-bulk-status-edit-modal')
			.addEventListener('click', () => {
				this.hideBulkStatusEditModal();
			});
		modal
			.querySelector('#cancel-bulk-status-edit')
			.addEventListener('click', () => {
				this.hideBulkStatusEditModal();
			});
		modal
			.querySelector('#apply-bulk-status-edit')
			.addEventListener('click', () => {
				this.handleBulkStatusEdit();
			});
	}

	hideBulkStatusEditModal() {
		const modal = this.container.querySelector(
			'.bulk-status-edit-modal-overlay'
		);
		if (modal) {
			modal.remove();
		}
	}

	handleBulkStatusEdit() {
		const select = document.getElementById('bulk-status-select');
		const newStatus = select.value;
		if (!newStatus) {
			alert('Please select a status');
			return;
		}

		if (confirm(`Set all items to status "${newStatus}"?`)) {
			// Get all items and update their status
			const items = this.currentState?.items || [];
			const updates = items.map((item) => ({
				...item,
				status: newStatus,
			}));

			// Dispatch bulk update
			this.controller.dispatchBulkUpsert(updates);
			this.hideBulkStatusEditModal();
		}
	}
	*/

	handleMetadataFormSubmit() {
		const form = document.getElementById('metadata-form');
		const formData = new FormData(form);

		// Store old schema for migration comparison
		const oldSchema = this.currentSchema
			? JSON.parse(JSON.stringify(this.currentSchema))
			: null;

		// Process field configuration
		const fields = [];
		const fieldIndices = new Set();

		// Collect all field indices from form data
		for (const [key, value] of formData.entries()) {
			if (key.startsWith('field-name-')) {
				const index = key.split('-')[2];
				fieldIndices.add(index);
			}
		}

		// Build fields array from form data
		for (const index of fieldIndices) {
			const field = {
				name: formData.get(`field-name-${index}`) || '',
				displayName: formData.get(`field-displayName-${index}`) || '',
				type: formData.get(`field-type-${index}`) || 'text',
				required: formData.has(`field-required-${index}`),
				readOnly: formData.has(`field-readOnly-${index}`),
				primaryKey: formData.has(`field-primaryKey-${index}`),
			};

			// Handle enum options
			if (field.type === 'enum') {
				const optionsStr = formData.get(`field-options-${index}`) || '';
				field.options = optionsStr
					.split(',')
					.map((opt) => opt.trim())
					.filter((opt) => opt);
			}

			// Only add fields with names
			if (field.name) {
				fields.push(field);
			}
		}

		// Process controls configuration
		const controls = [];
		if (formData.has('control-add')) controls.push('add');
		if (formData.has('control-edit')) controls.push('edit');
		if (formData.has('control-delete')) controls.push('delete');
		if (formData.has('control-bulk-upsert')) controls.push('bulk-upsert');
		if (formData.has('control-selected-edit'))
			controls.push('selected-edit');

		// Process showHeaders setting
		const showHeaders = formData.has('show-headers');

		const metadata = {
			title: formData.get('title') || 'My Database',
			description: formData.get('description') || '',
			fields: fields,
			controls: controls,
			showHeaders: showHeaders,
		};

		// Update the current schema
		if (this.currentSchema) {
			this.currentSchema.title = metadata.title;
			this.currentSchema.description = metadata.description;
			this.currentSchema.fields = metadata.fields;
			this.currentSchema.controls = metadata.controls;
			this.currentSchema.showHeaders = metadata.showHeaders;
		}

		// Update the header title
		this.updateHeaderTitle(metadata.title);

		// Dispatch event to save metadata
		this.controller.dispatchUpdateMetadata(metadata);

		this.hideMetadataEditForm();
	}

	addField() {
		if (!this.currentSchema) {
			this.currentSchema = { fields: [] };
		}
		if (!this.currentSchema.fields) {
			this.currentSchema.fields = [];
		}

		// Add a new field
		this.currentSchema.fields.push({
			name: `field_${Date.now()}`,
			displayName: 'New Field',
			type: 'text',
			required: false,
			readOnly: false,
			primaryKey: false,
		});

		// Refresh the fields container
		const container = document.getElementById('fields-container');
		if (container) {
			container.innerHTML = this.generateFieldsConfig();
		}
	}

	removeField(index) {
		if (this.currentSchema && this.currentSchema.fields) {
			this.currentSchema.fields.splice(index, 1);

			// Refresh the fields container
			const container = document.getElementById('fields-container');
			if (container) {
				container.innerHTML = this.generateFieldsConfig();
			}
		}
	}

	formatDate(dateString) {
		if (!dateString) return '';

		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) return dateString;

			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch (error) {
			return dateString;
		}
	}

	generateFieldsConfig() {
		const fields = this.currentSchema?.fields || [];

		return fields
			.map(
				(field, index) => html`
					<div
						class="field-config"
						data-index="${index}"
					>
						<div class="field-config-header">
							<span class="field-name"
								>${field.displayName || field.name}</span
							>
							<button
								type="button"
								class="remove-field-btn"
								data-index="${index}"
							>
								×
							</button>
						</div>
						<div class="field-config-body">
							<div class="field-config-row">
								<div class="field-config-col">
									<label>Name</label>
									<input
										type="text"
										name="field-name-${index}"
										value="${field.name}"
									/>
								</div>
								<div class="field-config-col">
									<label>Display Name</label>
									<input
										type="text"
										name="field-displayName-${index}"
										value="${field.displayName ||
										field.name}"
									/>
								</div>
								<div class="field-config-col">
									<label>Type</label>
									<select name="field-type-${index}">
										<option
											value="text"
											${field.type === 'text'
												? 'selected'
												: ''}
										>
											Text
										</option>
										<option
											value="integer"
											${field.type === 'integer'
												? 'selected'
												: ''}
										>
											Integer
										</option>
										<option
											value="enum"
											${field.type === 'enum'
												? 'selected'
												: ''}
										>
											Enum
										</option>
										<option
											value="datetime"
											${field.type === 'datetime'
												? 'selected'
												: ''}
										>
											DateTime
										</option>
									</select>
								</div>
							</div>
							<div class="field-config-row">
								<div class="field-config-col">
									<label>
										<input
											type="checkbox"
											name="field-required-${index}"
											${field.required ? 'checked' : ''}
										/>
										Required
									</label>
								</div>
								<div class="field-config-col">
									<label>
										<input
											type="checkbox"
											name="field-readOnly-${index}"
											${field.readOnly ? 'checked' : ''}
										/>
										Read Only
									</label>
								</div>
								<div class="field-config-col">
									<label>
										<input
											type="checkbox"
											name="field-primaryKey-${index}"
											${field.primaryKey ? 'checked' : ''}
										/>
										Primary Key
									</label>
								</div>
							</div>
							${field.type === 'enum'
								? html`
										<div class="field-config-row">
											<div
												class="field-config-col full-width"
											>
												<label
													>Options
													(comma-separated)</label
												>
												<input
													type="text"
													name="field-options-${index}"
													value="${field.options?.join(
														', '
													) || ''}"
													placeholder="Option1, Option2, Option3"
												/>
											</div>
										</div>
								  `
								: ''}
						</div>
					</div>
				`
			)
			.join('');
	}

	generateListUI(schema, state) {
		const tableName = schema.tableName || 'items';
		const items = state?.[tableName] || [];
		const fields = schema.fields || [];

		// Filter out read-only and auto-increment fields for the form
		const editableFields = fields.filter(
			(field) => !field.readOnly && !field.autoIncrement
		);

		// Calculate grid template columns
		const hasActions =
			schema.controls?.includes('edit') ||
			schema.controls?.includes('delete');
		const totalColumns = fields.length + (hasActions ? 1 : 0);
		const textColumns = fields.filter(
			(field) => field.type === 'text'
		).length;
		const nonTextColumns =
			fields.length - textColumns + (hasActions ? 1 : 0);

		// Check if headers should be shown (default to true for backward compatibility)
		const showHeaders = schema.showHeaders !== false;

		// Check if any controls will actually be rendered
		const hasAddControl = schema.controls?.includes('add');
		const hasBulkUpsertControl =
			schema.controls?.includes('bulk-upsert') && items.length > 0;
		const hasAnyControls = hasAddControl || hasBulkUpsertControl;

		// Create grid template: text columns get more space, others get fixed width
		const gridTemplate = fields
			.map((field) => (field.type === 'text' ? '1fr' : 'auto'))
			.concat(hasActions ? ['auto'] : [])
			.join(' ');

		return html`
			<div class="list-ui">
				<div class="list-controls">
					${hasAddControl
						? html`
								<button
									id="add-item-btn"
									class="action-btn primary"
								>
									Add Item
								</button>
						  `
						: ''}
					${hasBulkUpsertControl
						? html`
								<button
									id="bulk-upsert-btn"
									class="action-btn secondary"
								>
									Bulk Upsert
								</button>
						  `
						: ''}
					<!-- TEMPORARY: Bulk Status Edit -->
					<!-- <button
						id="bulk-status-edit-btn"
						class="action-btn secondary"
					>
						Bulk Status Edit
					</button> -->
				</div>

				<div class="list-grid-container">
					${items.length === 0
						? html` <p class="empty-state">No items yet</p> `
						: html`
								<div
									class="list-grid"
									style="grid-template-columns: ${gridTemplate}"
								>
									${showHeaders
										? html`
												<!-- Header row -->
												${fields
													.map(
														(field) => html`
															<div
																class="grid-header ${field.type ===
																'text'
																	? 'text-column'
																	: ''}"
															>
																${field.displayName ||
																field.name}
															</div>
														`
													)
													.join('')}
												${schema.controls?.includes(
													'edit'
												) ||
												schema.controls?.includes(
													'delete'
												)
													? html`<div
															class="grid-header actions-header"
													  >
															Actions
													  </div>`
													: ''}
										  `
										: ''}

									<!-- Data rows -->
									${items
										.map(
											(item) => html`
												<div
													class="grid-row"
													data-row-id="${item.id}"
												>
													${fields
														.map(
															(field) => html`
																<div
																	class="grid-cell ${field.name}-column"
																>
																	${field.type ===
																	'datetime'
																		? this.formatDate(
																				item[
																					field
																						.name
																				]
																		  )
																		: item[
																				field
																					.name
																		  ] ||
																		  ''}
																</div>
															`
														)
														.join('')}
													${schema.controls?.includes(
														'edit'
													) ||
													schema.controls?.includes(
														'delete'
													)
														? html`
																<div
																	class="grid-cell actions-cell"
																>
																	${schema.controls?.includes(
																		'edit'
																	)
																		? html`
																				<button
																					class="action-btn secondary edit-btn"
																					data-id="${item.id}"
																				>
																					Edit
																				</button>
																		  `
																		: ''}
																	${schema.controls?.includes(
																		'delete'
																	)
																		? html`
																				<button
																					class="action-btn danger delete-btn"
																					data-id="${item.id}"
																				>
																					Delete
																				</button>
																		  `
																		: ''}
																</div>
														  `
														: ''}
												</div>
											`
										)
										.join('')}
								</div>
						  `}
				</div>
			</div>
		`;
	}

	generateFieldInput(field) {
		const requiredAttr = field.required ? 'required' : '';

		switch (field.type) {
			case 'enum':
				return html`
					<select
						id="${field.name}"
						name="${field.name}"
						${requiredAttr}
					>
						<option value="">
							Select ${field.displayName || field.name}
						</option>
						${field.options
							?.map(
								(option) => html`
									<option value="${option}">${option}</option>
								`
							)
							.join('')}
					</select>
				`;
			case 'text':
				return html`
					<input
						type="text"
						id="${field.name}"
						name="${field.name}"
						${requiredAttr}
						placeholder="Enter ${field.displayName || field.name}"
					/>
				`;
			case 'integer':
				return html`
					<input
						type="number"
						id="${field.name}"
						name="${field.name}"
						${requiredAttr}
						placeholder="Enter ${field.displayName || field.name}"
					/>
				`;
			case 'datetime':
				return html`
					<input
						type="datetime-local"
						id="${field.name}"
						name="${field.name}"
						${requiredAttr}
					/>
				`;
			default:
				return html`
					<input
						type="text"
						id="${field.name}"
						name="${field.name}"
						${requiredAttr}
						placeholder="Enter ${field.displayName || field.name}"
					/>
				`;
		}
	}

	generateFieldInputForModal(field, selectedItem) {
		const requiredAttr = field.required ? 'required' : '';
		const currentValue = selectedItem[field.name] || '';

		switch (field.type) {
			case 'enum':
				return html`
					<select
						id="selected-edit-${field.name}"
						name="${field.name}"
						${requiredAttr}
					>
						<option value="">
							Select ${field.displayName || field.name}
						</option>
						${field.options
							?.map(
								(option) => html`
									<option
										value="${option}"
										${currentValue === option
											? 'selected'
											: ''}
									>
										${option}
									</option>
								`
							)
							.join('')}
					</select>
				`;
			case 'text':
				return html`
					<input
						type="text"
						id="selected-edit-${field.name}"
						name="${field.name}"
						value="${currentValue}"
						${requiredAttr}
						placeholder="Enter ${field.displayName || field.name}"
					/>
				`;
			case 'integer':
				return html`
					<input
						type="number"
						id="selected-edit-${field.name}"
						name="${field.name}"
						value="${currentValue}"
						${requiredAttr}
						placeholder="Enter ${field.displayName || field.name}"
					/>
				`;
			case 'datetime':
				return html`
					<input
						type="datetime-local"
						id="selected-edit-${field.name}"
						name="${field.name}"
						value="${currentValue}"
						${requiredAttr}
						placeholder="Enter ${field.displayName || field.name}"
					/>
				`;
			default:
				return html`
					<input
						type="text"
						id="selected-edit-${field.name}"
						name="${field.name}"
						value="${currentValue}"
						${requiredAttr}
						placeholder="Enter ${field.displayName || field.name}"
					/>
				`;
		}
	}

	getItemById(itemId) {
		if (!this.currentState || !this.currentSchema) return null;

		const tableName = this.currentSchema.tableName || 'items';
		const items = this.currentState[tableName] || [];
		return items.find((item) => item.id == itemId);
	}

	selectRow(rowId) {
		const row = this.container.querySelector(
			`.grid-row[data-row-id="${rowId}"]`
		);
		if (row) {
			row.querySelectorAll('.grid-cell').forEach((cell) =>
				cell.classList.add('row-selected')
			);
			// Show edit button if selectedEdit control is enabled
			this.showSelectedEditButton();
		}
	}

	clearRowSelection() {
		this.container
			.querySelectorAll('.row-selected')
			.forEach((cell) => cell.classList.remove('row-selected'));
		// Hide edit button when selection is cleared
		this.hideSelectedEditButton();
	}

	showAddForm() {
		// Open the modal for adding a new item (no selected item)
		this.showSelectedEditModal(null);
	}

	showEditForm(itemId) {
		// Open the modal for editing an existing item
		this.showSelectedEditModal(itemId);
	}

	handleDeleteClick(itemId) {
		if (confirm('Are you sure you want to delete this item?')) {
			// Call controller method to dispatch event
			this.controller.dispatchDeleteData(itemId);
		}
	}

	showDatabaseError(error) {
		const display = this.container.querySelector('#file-content-display');
		if (display) {
			display.innerHTML = html`
				<div class="database-error">
					<h4>Database Error</h4>
					<p style="color: red;">${error}</p>
				</div>
			`;
		}
	}
}
