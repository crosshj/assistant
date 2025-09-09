import { dispatchEvent } from '../_lib/utils.js';

/**
 * Database operation handlers for ApplicationController
 */
export function getHandlers(appController) {
	const dispatchDbState = (
		action,
		message,
		state = null,
		metadata = null
	) => {
		// Get current database state if not provided
		if (!state) {
			state = {};
			try {
				const itemsResults =
					appController.databaseService.queryTable('items');
				state['items'] = itemsResults;
			} catch (tableError) {
				state['items'] = { error: tableError.message };
			}
		}

		// Get current metadata if not provided
		if (!metadata) {
			metadata = {
				version: appController.databaseService.getVersion(),
				schema: appController.databaseService.getSchema(),
			};
		}

		dispatchEvent('db:state', {
			action,
			state,
			metadata,
			message,
		});
	};

	return {
		async handleLoadFromFile(file) {
			try {
				const arrayBuffer = await file.arrayBuffer();
				await this.handleLoadFromArrayBuffer(arrayBuffer);
			} catch (error) {
				console.log('File is not a valid database:', error.message);
				// Still enable file operations even if not a database
			}
		},

		async handleLoadFromArrayBuffer(arrayBuffer) {
			try {
				const dbInfo = await appController.databaseService.loadFromFile(
					arrayBuffer
				);
				console.log('Database loaded:', dbInfo);

				dispatchDbState(
					'file_opened',
					'Database loaded successfully',
					null,
					{
						version: dbInfo.version,
						schema: dbInfo.schema,
					}
				);
			} catch (error) {
				console.error('Error loading database:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Error: ${error.message}`,
				});
			}
		},

		async handleTestLoadDatabase() {
			try {
				console.log('Testing database loading...');
				const fileData = appController.fileService.getFileData();
				if (!fileData) {
					throw new Error(
						'No file data available. Open a file first.'
					);
				}

				const arrayBuffer = await fileData.arrayBuffer();
				const dbInfo = await appController.databaseService.loadFromFile(
					arrayBuffer
				);

				console.log('Database loaded successfully:', dbInfo);

				// Get only items table data
				const allResults = {};
				try {
					const itemsResults =
						appController.databaseService.queryTable('items');
					allResults['items'] = itemsResults;
				} catch (tableError) {
					allResults['items'] = { error: tableError.message };
				}

				dispatchEvent('db:state', {
					action: 'file_opened',
					state: allResults,
					metadata: {
						version: dbInfo.version,
						schema: dbInfo.schema,
					},
					message: 'Database loaded successfully',
				});
			} catch (error) {
				console.error('Error loading database:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Error: ${error.message}`,
				});
			}
		},

		async handleTestInsertData(event) {
			try {
				// Extract parameters from event detail or use defaults
				const tableName = event?.detail?.tableName || 'items';
				const data = event?.detail?.data || {
					text: 'Test item',
				};
				console.log(`Testing database insert into ${tableName}:`, data);

				if (!appController.databaseService.isLoaded()) {
					throw new Error('No database loaded');
				}

				const insertId = appController.databaseService.insertData(
					tableName,
					data
				);
				console.log(`Insert successful, ID: ${insertId}`);

				// Auto-save after insert
				try {
					const dbData =
						appController.databaseService.exportDatabase();
					await appController.fileHandlers.saveFile(dbData);
				} catch (saveError) {
					console.warn('Auto-save failed after insert:', saveError);
				}

				dispatchDbState(
					'item_inserted',
					`Item inserted successfully (ID: ${insertId})`
				);
			} catch (error) {
				console.error('Error inserting data:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Error: ${error.message}`,
				});
			}
		},

		async handleTestUpdateData(event) {
			try {
				// Extract parameters from event detail or use defaults
				const tableName = event?.detail?.tableName || 'items';
				const timestamp = new Date().toLocaleTimeString();
				const data = event?.detail?.data || {
					text: `Updated at ${timestamp}`,
				};

				if (!appController.databaseService.isLoaded()) {
					throw new Error('No database loaded');
				}

				// Get the last item ID directly from database right before update
				const lastItem =
					appController.databaseService.queryTable(tableName);
				if (!lastItem || lastItem.length === 0) {
					throw new Error('No items to update');
				}
				const lastId = lastItem[lastItem.length - 1].id;
				const whereClause = `id = ${lastId}`;

				console.log(
					`Testing database update in ${tableName}:`,
					data,
					`(updating item ID: ${lastId})`
				);

				const rowsAffected = appController.databaseService.updateData(
					tableName,
					data,
					whereClause
				);
				console.log(
					`Update successful, rows affected: ${rowsAffected}`
				);

				// Auto-save after update
				try {
					const dbData =
						appController.databaseService.exportDatabase();
					await appController.fileHandlers.saveFile(dbData);
				} catch (saveError) {
					console.warn('Auto-save failed after update:', saveError);
				}

				dispatchDbState(
					'item_updated',
					`Item updated successfully (${rowsAffected} rows affected)`
				);
			} catch (error) {
				console.error('Error updating data:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Error: ${error.message}`,
				});
			}
		},

		async handleTestDeleteData(event) {
			try {
				// Extract parameters from event detail or use defaults
				const tableName = event?.detail?.tableName || 'items';

				// Get the last item ID instead of hardcoded ID
				const lastItem =
					appController.databaseService.queryTable(tableName);
				if (!lastItem || lastItem.length === 0) {
					throw new Error('No items to delete');
				}
				const lastId = lastItem[lastItem.length - 1].id;
				const whereClause = `id = ${lastId}`;

				console.log(
					`Testing database delete from ${tableName} where ${whereClause} (deleting item ID: ${lastId})`
				);

				if (!appController.databaseService.isLoaded()) {
					throw new Error('No database loaded');
				}

				const rowsAffected = appController.databaseService.deleteData(
					tableName,
					whereClause
				);
				console.log(
					`Delete successful, rows affected: ${rowsAffected}`
				);

				// Auto-save after delete
				try {
					const dbData =
						appController.databaseService.exportDatabase();
					await appController.fileHandlers.saveFile(dbData);
				} catch (saveError) {
					console.warn('Auto-save failed after delete:', saveError);
				}

				dispatchDbState(
					'item_deleted',
					`Item deleted successfully (${rowsAffected} rows affected)`
				);
			} catch (error) {
				console.error('Error deleting data:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Error: ${error.message}`,
				});
			}
		},

		async handleTestExportDatabase() {
			try {
				console.log('Testing database export...');

				if (!appController.databaseService.isLoaded()) {
					throw new Error('No database loaded');
				}

				const dbData = appController.databaseService.exportDatabase();
				console.log(
					`Database exported, size: ${dbData.byteLength} bytes`
				);

				dispatchEvent('db:query', {
					action: 'export',
					size: dbData.byteLength,
					message: 'Database exported successfully',
				});
			} catch (error) {
				console.error('Error exporting database:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Error: ${error.message}`,
				});
			}
		},
	};
}
