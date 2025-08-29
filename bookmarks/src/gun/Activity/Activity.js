import { html } from '../lib/utils.js';
import './Activity.css';

export class Activity {
	constructor(containerId = 'right-pane') {
		this.container = null;
		this.logElement = null;
		this.log = [];

		this.render(containerId);
		// Event binding handled by ActivityController via delegation
	}

	render(containerId) {
		// Find the specified container
		this.container = document.getElementById(containerId);
		if (!this.container) {
			console.error(`Container '${containerId}' not found`);
			return;
		}

		// Create the activity panel DOM structure
		this.container.innerHTML = html`
			<aside class="card">
				<header
					style="
						display: flex;
						justify-content: space-between;
						align-items: center;
					"
				>
					<h3 style="margin: 0">Activity</h3>
					<div
						style="display: flex; gap: 0.5rem; align-items: center"
					>
						<button
							id="copyLog"
							class="secondary"
							style="
								border: none;
								background: transparent;
								padding: 0.5rem;
								cursor: pointer;
								border-radius: 4px;
								transition: background-color 0.2s;
							"
							title="Copy activity log to clipboard"
							onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'"
							onmouseout="this.style.backgroundColor='transparent'"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<!-- Back document (filled, slightly offset) -->
								<path
									d="M15 0H3c-1.1 0-2 .9-2 2v14h2V2h12V0z"
									fill="currentColor"
								/>
								<!-- Front document (solid/filled) -->
								<path
									d="M19 5H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"
									fill="currentColor"
								/>
							</svg>
						</button>
						<button
							id="clearLog"
							class="secondary"
							style="
								border: none;
								background: transparent;
								padding: 0.5rem;
								cursor: pointer;
								border-radius: 4px;
								transition: background-color 0.2s;
							"
							title="Clear activity log"
							onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'"
							onmouseout="this.style.backgroundColor='transparent'"
						>
							<svg
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<!-- Trash can body -->
								<path
									d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"
								/>
								<!-- Trash can lid -->
								<path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
								<!-- Trash can opening -->
								<path d="M8 9h8v1H8V9z" />
							</svg>
						</button>
					</div>
				</header>
				<div class="body">
					<ul
						id="log"
						class="list"
					></ul>
				</div>
			</aside>
		`;

		// Store reference to log element
		this.logElement = this.container.querySelector('#log');
	}

	// Public methods for logging
	logMessage(message, type = 'info') {
		const now = new Date();
		const timestamp = now.toLocaleTimeString('en-GB', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3,
		});
		const logEntry = {
			message,
			type,
			timestamp,
			id: Date.now() + Math.random(),
		};

		this.log.push(logEntry);
		this.renderLog();
	}

	renderLog() {
		if (!this.logElement) return;

		this.logElement.innerHTML = this.log
			.map(
				(entry) => `
				<li class="log-entry log-${entry.type}">
					<span class="log-timestamp">${entry.timestamp}</span>
					<span class="log-message">${entry.message}</span>
				</li>
			`
			)
			.join('');
	}

	// Method to get the current log (for external access)
	getLog() {
		return [...this.log];
	}

	// Method for controller to clear log
	clearLog() {
		this.log = [];
		this.renderLog();
	}

	// Convenience methods for different log types
	info(message) {
		this.logMessage(message, 'info');
	}

	success(message) {
		this.logMessage(message, 'success');
	}

	warning(message) {
		this.logMessage(message, 'warning');
	}

	error(message) {
		this.logMessage(message, 'error');
	}
}
