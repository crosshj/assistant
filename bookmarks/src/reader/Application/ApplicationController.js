import { dispatchEvent, addEventListener } from '../_lib/utils.js';
import { FileService } from '../_lib/fileService.js';
import { DatabaseService } from '../_lib/databaseService.js';
import { getHandlers as getFileHandlers } from './handlersFiles.js';
import { getHandlers as getDatabaseHandlers } from './handlersDatabase.js';

export class ApplicationController {
	constructor() {
		this.fileService = new FileService();
		this.databaseService = new DatabaseService();
		this.fileHandlers = getFileHandlers(this);
		this.databaseHandlers = getDatabaseHandlers(this);
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

		// Database operation event handlers
		addEventListener(
			'ui:testInsertData',
			this.databaseHandlers.handleTestInsertData
		);
		addEventListener(
			'ui:testUpdateData',
			this.databaseHandlers.handleTestUpdateData
		);
		addEventListener(
			'ui:testDeleteData',
			this.databaseHandlers.handleTestDeleteData
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
