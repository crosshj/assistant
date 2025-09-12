/**
 * File Service
 * Handles File System Access API operations for .smartText files
 */
export class FileService {
	constructor() {
		this.fileHandle = null;
		this.fileData = null;
	}

	/**
	 * Open file picker to select .smartText file
	 * @returns {Promise<File>} Selected file
	 */
	async openFile() {
		try {
			// Check if File System Access API is supported
			if (!('showOpenFilePicker' in window)) {
				throw new Error('File System Access API not supported');
			}

			// Show file picker for .smartText files
			const [fileHandle] = await window.showOpenFilePicker({
				types: [
					{
						description: 'Reader Database files',
						accept: {
							'application/octet-stream': ['.smartText'],
						},
					},
				],
				excludeAcceptAllOption: true,
			});

			this.fileHandle = fileHandle;
			const file = await fileHandle.getFile();
			this.fileData = file;

			return file;
		} catch (error) {
			if (error.name === 'AbortError') {
				return null;
			}
			console.error('Error opening file:', error);
			throw error;
		}
	}

	/**
	 * Create new .smartText file
	 * @returns {Promise<FileSystemFileHandle>} New file handle
	 */
	async createFile() {
		try {
			// Check if File System Access API is supported
			if (!('showSaveFilePicker' in window)) {
				throw new Error('File System Access API not supported');
			}

			// Show save file picker for .smartText files
			const fileHandle = await window.showSaveFilePicker({
				types: [
					{
						description: 'Reader Database files',
						accept: {
							'application/octet-stream': ['.smartText'],
						},
					},
				],
				suggestedName: 'eg.smartText',
			});

			this.fileHandle = fileHandle;
			console.log('File created:', fileHandle.name);
			return fileHandle;
		} catch (error) {
			if (error.name === 'AbortError') {
				console.log('File creation cancelled');
				return null;
			}
			console.error('Error creating file:', error);
			throw error;
		}
	}

	/**
	 * Save data to the current file
	 * @param {ArrayBuffer} data - Data to save
	 * @returns {Promise<void>}
	 */
	async saveFile(data) {
		if (!this.fileHandle) {
			throw new Error('No file handle available');
		}

		try {
			const writable = await this.fileHandle.createWritable();
			await writable.write(data);
			await writable.close();
			console.log('File saved successfully');
		} catch (error) {
			console.error('Error saving file:', error);
			throw error;
		}
	}

	/**
	 * Get current file handle
	 * @returns {FileSystemFileHandle|null}
	 */
	getFileHandle() {
		return this.fileHandle;
	}

	/**
	 * Get current file data
	 * @returns {File|null}
	 */
	getFileData() {
		return this.fileData;
	}

	/**
	 * Update file data after saving
	 * @param {ArrayBuffer} data - New file data
	 */
	updateFileData(data) {
		if (this.fileHandle) {
			// Create a new File object with the updated data
			this.fileData = new File([data], this.fileHandle.name, {
				type: 'application/octet-stream',
			});
		}
	}

	/**
	 * Set file handle and data (used after creation)
	 * @param {FileSystemFileHandle} fileHandle - File handle
	 * @param {File} file - File data
	 */
	setFile(fileHandle, file) {
		this.fileHandle = fileHandle;
		this.fileData = file;
	}

	/**
	 * Check if File System Access API is supported
	 * @returns {boolean}
	 */
	isSupported() {
		return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
	}
}
