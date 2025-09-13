import { dispatchEvent } from '../_lib/utils.js';

/**
 * File operation handlers for ApplicationController
 */
export function getHandlers(appController) {
	return {
		async handleOpenFile(event) {
			try {
				// Show loading state
				dispatchEvent('ui:loading', { message: 'Opening file...' });

				let file;

				// Check if file was passed from system (file association)
				if (event?.detail?.file) {
					file = event.detail.file;
					console.log('Opening file from system:', file.name);
				} else {
					// Use file picker
					file = await appController.fileService.openFile();
				}

				if (file) {
					// Validate file type
					if (!file.name.toLowerCase().endsWith('.smarttext')) {
						throw new Error('Please select a .smartText file');
					}

					// Call database handler to load the file
					await appController.databaseHandlers.handleLoadFromFile(
						file
					);

					// Enable save button since we now have a file handle
					dispatchEvent('file:opened');

					console.log('File opened successfully:', file.name);
				} else {
					console.log('File picker cancelled');
					// Show splash screen again
					dispatchEvent('ui:showSplash');
				}
			} catch (error) {
				console.error(`Error opening file: ${error.message}`);
				// Dispatch error event for UI to handle
				dispatchEvent('file:error', {
					error: error.message,
					action: 'open',
				});
			}
		},

		async handleCreateFile() {
			try {
				// Show loading state
				dispatchEvent('ui:loading', {
					message: 'Creating new file...',
				});

				console.log('Creating new file...');
				const fileHandle = await appController.fileService.createFile();
				if (fileHandle) {
					// Create a barebones SQLite database
					const dbData =
						await appController.databaseService.createBarebonesDatabase();

					// Save the database
					await appController.fileService.saveFile(dbData);

					// Update file data after saving
					appController.fileService.updateFileData(dbData);

					console.log(`File created: ${fileHandle.name}`);

					// Call database handler to load the created file
					await appController.databaseHandlers.handleLoadFromArrayBuffer(
						dbData
					);

					// Enable save button since we now have a file handle
					dispatchEvent('file:opened');
				} else {
					console.log('File creation cancelled');
					// Show splash screen again
					dispatchEvent('ui:showSplash');
				}
			} catch (error) {
				console.error(`Error creating file: ${error.message}`);
				// Dispatch error event for UI to handle
				dispatchEvent('file:error', {
					error: error.message,
					action: 'create',
				});
			}
		},

		async saveFile(data) {
			try {
				await appController.fileService.saveFile(data);
				appController.fileService.updateFileData(data);
				console.log('File saved successfully');
				dispatchEvent('file:saved');
			} catch (error) {
				console.error('Save failed:', error);
				// Dispatch error event for UI to handle
				dispatchEvent('file:error', {
					error: error.message,
					action: 'save',
				});
				throw error;
			}
		},
	};
}
