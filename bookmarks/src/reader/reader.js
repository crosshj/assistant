import './reader.css';
import { dispatchEvent } from './_lib/utils.js';

// Import controllers
import { ApplicationController } from './Application/ApplicationController.js';
import { ReaderController } from './Reader/ReaderController.js';

async function startReader() {
	// Initialize controllers
	const applicationController = new ApplicationController();
	const readerController = new ReaderController();

	// Show content once styles are loaded
	document.body.classList.add('styles-loaded');

	// Handle file opening from system
	window.handleFileOpen = async (file) => {
		try {
			// Dispatch file open event
			dispatchEvent('ui:openFile', { file });
		} catch (error) {
			console.error('Error handling file open:', error);
		}
	};

	dispatchEvent('app:init');
}

// Start the reader when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', startReader);
} else {
	startReader();
}
