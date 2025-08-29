import { Activity } from './Activity.js';

export class ActivityController {
	constructor() {
		// Create pure UI component (no controller reference needed)
		this.ui = new Activity();

		// Setup event listeners
		this.setupEventListeners();
	}

	setupEventListeners() {
		// Event delegation for log buttons (scoped to Activity component DOM)
		this.ui.container.addEventListener('click', (e) => {
			if (e.target.matches('#copyLog')) {
				this.handleCopyLog();
			}

			if (e.target.matches('#clearLog')) {
				this.handleClearLog();
			}
		});

		// Listen for logging events from any service/controller
		document.addEventListener('activity:log', (e) => {
			this.handleActivityLog(e.detail);
		});
	}

	handleActivityLog({ message, type = 'info' }) {
		// Update Activity component directly
		this.ui.logMessage(message, type);
	}

	handleCopyLog() {
		// Get log data from Activity component and reverse order (newest first)
		const logText = this.ui
			.getLog()
			.slice() // Create a copy before reversing

			.map((entry) => `[${entry.timestamp}] ${entry.message}`)
			.join('\n');

		navigator.clipboard.writeText(logText).catch(() => {
			this.ui.logMessage('Failed to copy log to clipboard', 'error');
		});
	}

	handleClearLog() {
		// Clear log in Activity component
		this.ui.clearLog();
	}
}
