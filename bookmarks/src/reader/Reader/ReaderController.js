import { dispatchEvent, addEventListener } from '../_lib/utils.js';
import { Reader } from './Reader.js';

export class ReaderController {
	constructor() {
		this.ui = new Reader(this);
		this.setupEventListeners();
	}

	setupEventListeners() {
		addEventListener('reader:ready', () => this.ui.showContent());

		// Event delegation for all UI interactions
		this.ui.container.addEventListener('click', (e) => {
			if (
				e.target.matches('#hamburger-menu') ||
				e.target.closest('#hamburger-menu')
			) {
				this.ui.toggleHamburgerMenu();
			}
			if (e.target.matches('#close-sidebar')) {
				this.ui.hideHamburgerMenu();
			}
			if (e.target.matches('#menu-open-file')) {
				this.ui.hideHamburgerMenu();
				dispatchEvent('ui:testFilePicker');
			}
			if (e.target.matches('#menu-create-file')) {
				this.ui.hideHamburgerMenu();
				dispatchEvent('ui:testCreateFile');
			}
			// Splash page button handlers
			if (e.target.matches('#test-file-picker')) {
				dispatchEvent('ui:testFilePicker');
			}
			if (e.target.matches('#test-create-file')) {
				dispatchEvent('ui:testCreateFile');
			}
			if (e.target.matches('#menu-edit-metadata')) {
				this.ui.hideHamburgerMenu();
				this.ui.showMetadataEditForm();
			}
			if (e.target.matches('#add-item-btn')) {
				this.ui.showAddForm();
			}
			if (e.target.matches('.edit-btn')) {
				this.ui.showEditForm(e.target.dataset.id);
			}
			if (e.target.matches('.delete-btn')) {
				this.ui.handleDeleteClick(e.target.dataset.id);
			}
			if (e.target.matches('#cancel-form')) {
				this.ui.hideForm();
			}
			if (
				e.target.matches('#close-metadata-modal') ||
				e.target.matches('#cancel-metadata')
			) {
				this.ui.hideMetadataEditForm();
			}
			if (e.target.matches('#save-metadata')) {
				this.ui.handleMetadataFormSubmit();
			}
			if (e.target.matches('#bulk-upsert-btn')) {
				this.handleBulkUpsert();
			}
		});

		// Close sidebar when clicking overlay
		this.ui.container.addEventListener('click', (e) => {
			if (e.target.matches('.sidebar-overlay')) {
				this.ui.hideHamburgerMenu();
			}
		});

		this.ui.container.addEventListener('submit', (e) => {
			if (e.target.matches('#item-form-element')) {
				e.preventDefault();
				this.ui.handleFormSubmit(e.target);
			}
		});

		addEventListener('db:state', (e) => {
			const { action, state, metadata, message, error } = e.detail;

			if (error) {
				this.ui.showDatabaseError(error);
			} else {
				console.log({ metadata });
				this.ui.showDatabaseState({ action, state, metadata, message });
			}
		});
	}

	// Controller methods for UI to call
	dispatchInsertData(data) {
		dispatchEvent('ui:testInsertData', { data });
	}

	dispatchUpdateData(data, itemId) {
		dispatchEvent('ui:testUpdateData', {
			data,
			whereClause: `id = ${itemId}`,
		});
	}

	dispatchDeleteData(itemId) {
		dispatchEvent('ui:testDeleteData', {
			tableName: 'items',
			whereClause: `id = ${itemId}`,
		});
	}

	dispatchUpdateMetadata(metadata) {
		dispatchEvent('ui:updateMetadata', { metadata });
	}

	dispatchBulkUpsert(items) {
		dispatchEvent('ui:bulkUpsert', {
			items: items,
			tableName: 'items',
		});
	}

	handleBulkUpsert() {
		this.ui.showBulkUpsertModal();
	}
}
