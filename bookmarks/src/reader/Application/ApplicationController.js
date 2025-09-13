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
		addEventListener('ui:openFile', this.fileHandlers.handleOpenFile);
		addEventListener('ui:createFile', this.fileHandlers.handleCreateFile);

		// Database operation event handlers
		addEventListener(
			'ui:insertData',
			this.databaseHandlers.handleInsertData
		);
		addEventListener(
			'ui:updateData',
			this.databaseHandlers.handleUpdateData
		);
		addEventListener(
			'ui:deleteData',
			this.databaseHandlers.handleDeleteData
		);
		addEventListener(
			'ui:updateMetadata',
			this.databaseHandlers.handleUpdateMetadata
		);
		addEventListener(
			'ui:bulkUpsert',
			this.databaseHandlers.handleBulkUpsert
		);
	}

	onAppInit() {
		// Application-level initialization will go here

		// Attach database cleanup functions to window object for easy access
		window.dbCleanup = {
			stats: async () => {
				await this.databaseHandlers.handleGetDatabaseStats();
			},
			cleanup: async () => {
				await this.databaseHandlers.handleCleanupDatabase();
			},
			removeTables: async () => {
				await this.databaseHandlers.handleRemoveUnusedTables();
			},
			tables: () => {
				if (this.databaseService.isLoaded()) {
					const tables = this.databaseService.getTableNames();
					console.log('📊 Database Tables:', tables);
					return tables;
				} else {
					console.log('❌ No database loaded');
					return [];
				}
			},
		};

		console.log(
			'🔧 Database cleanup functions available on window.dbCleanup:'
		);
		console.log('  - window.dbCleanup.tables() - List all tables');
		console.log('  - window.dbCleanup.stats() - Get database statistics');
		console.log(
			'  - window.dbCleanup.cleanup() - Clean up database (VACUUM + ANALYZE)'
		);
		console.log(
			'  - window.dbCleanup.removeTables() - Remove unused tables'
		);

		// Simulate some initialization work
		setTimeout(() => {
			dispatchEvent('reader:ready');
		}, 1000);
	}
}
