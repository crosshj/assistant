import {
	dispatchEvent,
	addEventListener,
	setupEventUtilities,
} from '../_lib/utils.js';
import { Reader } from './Reader.js';

export class ReaderController {
	constructor() {
		this.ui = new Reader(this);
		this.selectedRowId = null;
		setupEventUtilities(this.ui);
		this.setupEventListeners();
	}

	setupEventListeners() {
		addEventListener('reader:ready', () => this.ui.showContent());

		const uiClickHandlers = {
			'#hamburger-menu': () => this.ui.toggleHamburgerMenu(),
			'#close-sidebar': () => this.ui.hideHamburgerMenu(),
			'#menu-open-file': this.handleMenuOpenFile,
			'#menu-create-file': this.handleMenuCreateFile,
			'#open-file-btn': () => dispatchEvent('ui:openFile'),
			'#create-file-btn': () => dispatchEvent('ui:createFile'),
			'#menu-edit-metadata': () => this.ui.showMetadataEditForm(),
			'#add-item-btn': () => this.ui.showAddForm(),
			'.edit-btn': (e) => this.ui.showEditForm(e.target.dataset.id),
			'.delete-btn': (e) =>
				this.ui.handleDeleteClick(e.target.dataset.id),
			'#bulk-upsert-btn': () => this.ui.showBulkUpsertModal(),
			// '#bulk-status-edit-btn': () => this.ui.showBulkStatusEditModal(),
			'#selected-edit-btn': () => this.ui.showSelectedEditModal(),
			'.filter-icon-btn': (e) =>
				this.ui.toggleFilterDropdown(e.target.dataset.field),
			'#close-selected-edit-modal, #cancel-selected-edit': () =>
				this.ui.hideSelectedEditModal(),
			'#close-metadata-modal, #cancel-metadata': () =>
				this.ui.hideMetadataEditForm(),
			'#close-bulk-upsert-modal, #cancel-bulk-upsert': () =>
				this.ui.hideBulkUpsertModal(),
			// '#close-bulk-status-edit-modal, #cancel-bulk-status-edit': () =>
			// 	this.ui.hideBulkStatusEditModal(),
			'#retry-btn': () => this.ui.showContent(),
			'#retry-file-btn': () => this.ui.showContent(),
			'#back-to-splash-btn': () => this.ui.showContent(),
			'.sidebar-overlay': () => this.ui.hideHamburgerMenu(),
			'.grid-row': (e) => {
				if (e.target.matches('.action-btn')) return;
				const row = e.target.closest('.grid-row');
				if (row) {
					this.selectRow(row.dataset.rowId);
				}
			},
		};
		this.ui.bind('click', uiClickHandlers);

		this.ui.bind('submit', {
			'#selected-edit-form': (e) => {
				e.preventDefault();
				this.ui.handleSelectedEditFormSubmit(e.target);
			},
			'#metadata-form': (e) => {
				e.preventDefault();
				this.ui.handleMetadataFormSubmit();
			},
		});

		addEventListener('db:state', (e) => {
			const { action, state, metadata, message, error } = e.detail;

			if (error) {
				this.ui.showDatabaseError(error);
			} else {
				this.ui.showDatabaseState({ action, state, metadata, message });
			}
		});

		// File error handling
		addEventListener('file:error', (e) => {
			const { error, action } = e.detail;
			this.ui.showFileError(error, action);
		});

		// Loading state handling
		addEventListener('ui:loading', (e) => {
			const { message } = e.detail;
			this.ui.showLoadingState(message);
		});

		// Show splash screen
		addEventListener('ui:showSplash', () => {
			this.ui.showContent();
		});
	}

	// Controller methods for UI to call
	dispatchInsertData(data) {
		dispatchEvent('ui:insertData', { data });
	}

	dispatchUpdateData(data, itemId) {
		dispatchEvent('ui:updateData', {
			data,
			whereClause: `id = ${itemId}`,
		});
	}

	dispatchDeleteData(itemId) {
		dispatchEvent('ui:deleteData', {
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

	selectRow(rowId) {
		// Clear previous selection
		if (this.selectedRowId) {
			this.ui.clearRowSelection();
		}

		// Set new selection
		this.selectedRowId = rowId;
		this.ui.selectRow(rowId);

		// Fire selection event
		dispatchEvent('reader:itemSelected', {
			itemId: rowId,
			item: this.ui.getItemById(rowId),
		});
	}

	// Menu handlers that coordinate UI + events
	handleMenuOpenFile = () => {
		this.ui.hideHamburgerMenu();
		dispatchEvent('ui:openFile');
	};

	handleMenuCreateFile = () => {
		this.ui.hideHamburgerMenu();
		dispatchEvent('ui:createFile');
	};
}
