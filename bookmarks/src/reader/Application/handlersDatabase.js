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

				// Log all tables in the database
				const tableNames =
					appController.databaseService.getTableNames();
				console.log('📊 Database Tables:', tableNames);

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

		async handleLoadDatabase() {
			try {
				console.log('Loading database...');
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

		async handleInsertData(event) {
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

		async handleUpdateData(event) {
			try {
				// Extract parameters from event detail or use defaults
				const tableName = event?.detail?.tableName || 'items';
				const data = event?.detail?.data || {};
				const whereClause = event?.detail?.whereClause;

				if (!appController.databaseService.isLoaded()) {
					throw new Error('No database loaded');
				}

				// Use provided whereClause or fall back to last item
				let finalWhereClause = whereClause;
				if (!finalWhereClause) {
					const lastItem =
						appController.databaseService.queryTable(tableName);
					if (!lastItem || lastItem.length === 0) {
						throw new Error('No items to update');
					}
					const lastId = lastItem[lastItem.length - 1].id;
					finalWhereClause = `id = ${lastId}`;
				}

				console.log(
					`Testing database update in ${tableName}:`,
					data,
					`(updating with whereClause: ${finalWhereClause})`
				);

				const rowsAffected = appController.databaseService.updateData(
					tableName,
					data,
					finalWhereClause
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

		async handleDeleteData(event) {
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

		async handleExportDatabase() {
			try {
				console.log('Exporting database...');

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

		async handleUpdateMetadata(e) {
			const { metadata } = e.detail;

			try {
				console.log('=== METADATA UPDATE STARTED ===');

				// Update the schema in the database
				await appController.databaseService.updateSchema(metadata);
				console.log('Schema updated, migration completed');

				// Save the file to persist changes
				console.log('Exporting database data...');
				const dbData = appController.databaseService.exportDatabase();

				// Verify the exported data contains migrated values
				try {
					// Convert ArrayBuffer to string first
					const decoder = new TextDecoder();
					const dbDataString = decoder.decode(dbData);
					console.log(
						'Exported data type:',
						typeof dbData,
						'Length:',
						dbData.byteLength
					);
					console.log(
						'First 200 chars of exported data:',
						dbDataString.substring(0, 200)
					);

					const exportedDb = JSON.parse(dbDataString);
					if (exportedDb.tables && exportedDb.tables.items) {
						const items = exportedDb.tables.items;
						console.log(
							'Exported items sample (first 3):',
							items.slice(0, 3)
						);
						const statusCounts = {};
						items.forEach((item) => {
							statusCounts[item.status] =
								(statusCounts[item.status] || 0) + 1;
						});
						console.log(
							'Status counts in exported data:',
							statusCounts
						);
					}
				} catch (e) {
					console.log(
						'Could not parse exported data for verification:',
						e
					);
				}

				console.log('Database exported, saving file...');
				await appController.fileHandlers.saveFile(dbData);
				console.log('File saved successfully');

				// Use the existing dispatchDbState function
				console.log('Dispatching db:state event...');
				dispatchDbState(
					'metadata_updated',
					'Database metadata updated successfully'
				);
				console.log('=== METADATA UPDATE COMPLETED ===');
			} catch (error) {
				console.error('Error updating metadata:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Error updating metadata: ${error.message}`,
				});
			}
		},

		async handleBulkUpsert(e) {
			const { items, tableName } = e.detail;

			try {
				await appController.databaseService.bulkUpsert(
					items,
					tableName
				);

				// Save the file to persist changes
				try {
					const dbData =
						appController.databaseService.exportDatabase();
					await appController.fileHandlers.saveFile(dbData);
				} catch (saveError) {
					console.warn(
						'Auto-save failed after bulk upsert:',
						saveError
					);
				}

				dispatchDbState(
					'bulk_upserted',
					`Bulk upserted ${items.length} items`
				);
			} catch (error) {
				console.error('Error in bulk upsert:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Error in bulk upsert: ${error.message}`,
				});
			}
		},

		async handleCleanupDatabase() {
			try {
				console.log('🧹 Starting database cleanup...');

				// Get stats before cleanup
				const beforeStats =
					appController.databaseService.getDatabaseStats();
				console.log('📊 Database stats before cleanup:', beforeStats);

				// Run cleanup
				const cleanupResults =
					appController.databaseService.cleanupDatabase();

				// Auto-save after cleanup
				try {
					const dbData =
						appController.databaseService.exportDatabase();
					await appController.fileHandlers.saveFile(dbData);
					console.log('💾 Database saved after cleanup');
				} catch (saveError) {
					console.warn('Auto-save failed after cleanup:', saveError);
				}

				dispatchDbState(
					'cleanup',
					`Database cleaned up! Saved ${cleanupResults.savedBytes} bytes (${cleanupResults.savedPercent}%)`
				);
			} catch (error) {
				console.error('Error cleaning up database:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Cleanup error: ${error.message}`,
				});
			}
		},

		async handleRemoveUnusedTables() {
			try {
				console.log('🗑️ Removing unused tables...');

				// Remove unused tables (keeping only metadata and items)
				const cleanupResults =
					appController.databaseService.removeUnusedTables([
						'metadata',
						'items',
					]);

				// Auto-save after cleanup
				try {
					const dbData =
						appController.databaseService.exportDatabase();
					await appController.fileHandlers.saveFile(dbData);
					console.log(
						'💾 Database saved after removing unused tables'
					);
				} catch (saveError) {
					console.warn(
						'Auto-save failed after removing tables:',
						saveError
					);
				}

				dispatchDbState('cleanup_tables', cleanupResults.message);
			} catch (error) {
				console.error('Error removing unused tables:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Table cleanup error: ${error.message}`,
				});
			}
		},

		async handleGetDatabaseStats() {
			try {
				console.log('📊 Getting database statistics...');

				const stats = appController.databaseService.getDatabaseStats();
				console.log('📊 Database Statistics:', stats);

				dispatchDbState(
					'stats',
					`Database has ${stats.tables} tables, ${stats.fileSize} bytes, ${stats.pageCount} pages`
				);
			} catch (error) {
				console.error('Error getting database stats:', error);
				dispatchEvent('db:state', {
					action: 'error',
					error: error.message,
					message: `Stats error: ${error.message}`,
				});
			}
		},
	};
}
