import { dispatchEvent, addEventListener } from '../_lib/utils.js';
import { Reader } from './Reader.js';

export class ReaderController {
	constructor() {
		this.ui = new Reader();
		this.setupEventListeners();
	}

	setupEventListeners() {
		addEventListener('reader:ready', () => this.ui.showContent());

		// Test button event delegation - just fire events
		this.ui.container.addEventListener('click', (e) => {
			if (e.target.matches('#test-file-picker')) {
				dispatchEvent('ui:testFilePicker');
			}
			if (e.target.matches('#test-create-file')) {
				dispatchEvent('ui:testCreateFile');
			}
			if (e.target.matches('#test-insert-data')) {
				dispatchEvent('ui:testInsertData');
			}
			if (e.target.matches('#test-update-data')) {
				dispatchEvent('ui:testUpdateData');
			}
			if (e.target.matches('#test-delete-data')) {
				dispatchEvent('ui:testDeleteData');
			}
		});

		addEventListener('db:state', (e) => {
			const { action, state, metadata, message, error } = e.detail;

			if (error) {
				this.ui.showDatabaseError(error);
			} else {
				this.ui.showDatabaseState({ action, state, metadata, message });
				this.ui.enableDatabaseOperationButtons();
			}
		});
	}
}
