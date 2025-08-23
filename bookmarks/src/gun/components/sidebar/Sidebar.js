// Sidebar Component - Activity log and selected element display
export class Sidebar {
	constructor() {
		this.setupAutoJoin();
	}

	setupAutoJoin() {
		// Auto-join room from hash on page load
		window.addEventListener('load', () => {
			const hash = decodeURIComponent(location.hash.slice(1));
			const target = hash || 'public';
			$('room').value = target;

			// Wait for everything to initialize before joining
			setTimeout(() => {
				window.joinRoom && window.joinRoom(target);
			}, 500);
		});
	}

	// Log message to the activity sidebar
	log(message) {
		const li = document.createElement('li');
		li.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
		$('log').prepend(li);
		console.log(message);
	}

	// Update selected element display
	updateSelection(data) {
		$('sel').textContent = JSON.stringify(data, null, 2);
	}

	// Clear the log
	clearLog() {
		$('log').innerHTML = '';
	}

	// Add a log entry with custom styling
	logWithStyle(message, style = '') {
		const li = document.createElement('li');
		li.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
		if (style) li.style.cssText = style;
		$('log').prepend(li);
	}

	// Log success message
	success(message) {
		this.logWithStyle(message, 'color: #66bb6a;');
	}

	// Log warning message
	warning(message) {
		this.logWithStyle(message, 'color: #ffa726;');
	}

	// Log error message
	error(message) {
		this.logWithStyle(message, 'color: #ff6b6b;');
	}
}

// Helper functions
const $ = (id) => document.getElementById(id);
