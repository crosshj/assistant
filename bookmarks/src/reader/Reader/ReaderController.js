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
			'#test-file-picker': () => dispatchEvent('ui:testFilePicker'),
			'#test-create-file': () => dispatchEvent('ui:testCreateFile'),
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
		dispatchEvent('ui:testFilePicker');
	};

	handleMenuCreateFile = () => {
		this.ui.hideHamburgerMenu();
		dispatchEvent('ui:testCreateFile');
	};
}
