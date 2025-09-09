import { dispatchEvent, addEventListener } from '../_lib/utils.js';
import { FileService } from '../_lib/fileService.js';
import { getHandlers as getFileHandlers } from './handlersFiles.js';

export class ApplicationController {
	constructor() {
		this.fileService = new FileService();
		this.fileHandlers = getFileHandlers(this.fileService);
		this.setupEventListeners();
	}

	setupEventListeners() {
		addEventListener('app:init', this.onAppInit.bind(this));

		// File operation event handlers
		addEventListener(
			'ui:testFilePicker',
			this.fileHandlers.handleTestFilePicker
		);
		addEventListener(
			'ui:testCreateFile',
			this.fileHandlers.handleTestCreateFile
		);
		addEventListener(
			'ui:testSaveFile',
			this.fileHandlers.handleTestSaveFile
		);
	}

	onAppInit() {
		console.log('Application initialized');
		// Application-level initialization will go here

		// Simulate some initialization work
		setTimeout(() => {
			dispatchEvent('reader:ready');
		}, 1000);
	}
}
