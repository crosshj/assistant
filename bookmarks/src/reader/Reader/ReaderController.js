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
			if (e.target.matches('#test-save-file')) {
				dispatchEvent('ui:testSaveFile');
			}
		});

		addEventListener('file:content', (e) => {
			this.ui.showFileContent(e.detail.content);
		});

		addEventListener('file:opened', () => {
			this.ui.enableSaveButton();
		});
	}
}
