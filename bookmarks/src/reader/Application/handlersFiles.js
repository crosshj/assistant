import { dispatchEvent } from '../_lib/utils.js';

/**
 * File operation handlers for ApplicationController
 */
export function getHandlers(appController) {
	return {
		async handleTestFilePicker() {
			try {
				console.log('Testing file picker...');
				const file = await appController.fileService.openFile();
				if (file) {
					console.log(
						`File opened: ${file.name} (${file.size} bytes)`
					);

					// Call database handler to load the file
					await appController.databaseHandlers.handleLoadFromFile(
						file
					);

					// Enable save button since we now have a file handle
					dispatchEvent('file:opened');
				} else {
					console.log('File picker cancelled');
				}
			} catch (error) {
				console.error(`Error: ${error.message}`);
			}
		},

		async handleTestCreateFile() {
			try {
				console.log('Testing file creation...');
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
				}
			} catch (error) {
				console.error(`Error: ${error.message}`);
			}
		},

		async saveFile(data) {
			try {
				await appController.fileService.saveFile(data);
				appController.fileService.updateFileData(data);
				console.log('File saved');
			} catch (error) {
				console.warn('Save failed:', error);
				throw error;
			}
		},
	};
}
