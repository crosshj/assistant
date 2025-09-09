import { dispatchEvent } from '../_lib/utils.js';
import { FileService } from '../_lib/fileService.js';

/**
 * File operation handlers for ApplicationController
 */
export function getHandlers(fileService) {
	return {
		async handleTestFilePicker() {
			try {
				console.log('Testing file picker...');
				const file = await fileService.openFile();
				if (file) {
					console.log(
						`File opened: ${file.name} (${file.size} bytes)`
					);

					// Read and display file content
					const content = await file.text();
					dispatchEvent('file:content', { content });

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
				const fileHandle = await fileService.createFile();
				if (fileHandle) {
					// Create initial content with timestamp
					const now = new Date();
					const timestamp = now.toLocaleString();
					const content = `File created at ${timestamp}`;

					// Save the initial content
					const data = new TextEncoder().encode(content);
					await fileService.saveFile(data);

					// Update file data after saving
					fileService.updateFileData(data);

					console.log(`File created: ${fileHandle.name}`);

					// Display the content
					dispatchEvent('file:content', { content });

					// Enable save button since we now have a file handle
					dispatchEvent('file:opened');
				} else {
					console.log('File creation cancelled');
				}
			} catch (error) {
				console.error(`Error: ${error.message}`);
			}
		},

		async handleTestSaveFile() {
			try {
				console.log('Testing file save...');
				const fileHandle = fileService.getFileHandle();
				if (!fileHandle) {
					console.error(
						'No file handle available. Create or open a file first.'
					);
					return;
				}

				// Get current content and add save timestamp
				const currentFile = fileService.getFileData();
				let content = '';
				if (currentFile) {
					content = await currentFile.text();
				}

				const now = new Date();
				const timestamp = now.toLocaleString();
				const newContent = content + `\n\nSaved at ${timestamp}`;

				// Save the updated content
				const data = new TextEncoder().encode(newContent);
				await fileService.saveFile(data);

				// Update file data after saving
				fileService.updateFileData(data);

				console.log('File saved successfully');

				// Display the updated content
				dispatchEvent('file:content', { content: newContent });
			} catch (error) {
				console.error(`Error: ${error.message}`);
			}
		},
	};
}
