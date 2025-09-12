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
			'#cancel-form': () => this.ui.hideForm(),
			'#close-metadata-modal, #cancel-metadata': () =>
				this.ui.hideMetadataEditForm(),
			'#save-metadata': () => this.ui.handleMetadataFormSubmit(),
			'#bulk-upsert-btn': () => this.ui.showBulkUpsertModal(),
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
			'#item-form-element': (e) => {
				e.preventDefault();
				this.ui.handleFormSubmit(e.target);
			},
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
