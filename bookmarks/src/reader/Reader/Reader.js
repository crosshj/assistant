import { html } from '../_lib/utils.js';
import './Reader.css';

export class Reader {
	constructor() {
		this.container = document.createElement('div');
		this.container.classList.add('reader-container');
		document.body.appendChild(this.container);
		this.render();
	}

	render() {
		this.container.innerHTML = html`
			<header class="reader-header">
				<h1>Reader</h1>
			</header>
			<div class="reader-content">
				<div class="reader-loading">
					<div class="loading-spinner"></div>
					<p>Loading...</p>
				</div>
			</div>
		`;
	}

	showContent() {
		const content = this.container.querySelector('.reader-content');
		content.innerHTML = html`
			<div class="test-interface">
				<div class="test-sections">
					<div class="test-section">
						<h3>File Operations</h3>
						<div class="test-buttons">
							<button
								id="test-file-picker"
								class="test-btn"
							>
								Open File
							</button>
							<button
								id="test-create-file"
								class="test-btn"
							>
								Create File
							</button>
							<button
								id="test-save-file"
								class="test-btn"
								disabled
							>
								Save File
							</button>
						</div>
					</div>

					<div class="test-section">
						<h3>Database Operations</h3>
						<div class="test-buttons">
							<button
								id="test-db-load"
								class="test-btn"
								disabled
							>
								Load Database
							</button>
							<button
								id="test-db-query"
								class="test-btn"
								disabled
							>
								Query Database
							</button>
							<button
								id="test-db-schema"
								class="test-btn"
								disabled
							>
								Test Schema
							</button>
						</div>
					</div>

					<div class="test-section">
						<h3>UI Operations</h3>
						<div class="test-buttons">
							<button
								id="test-ui-generate"
								class="test-btn"
								disabled
							>
								Generate UI
							</button>
							<button
								id="test-ui-bind"
								class="test-btn"
								disabled
							>
								Test Binding
							</button>
						</div>
					</div>
				</div>

				<div class="file-content">
					<div class="file-content-header">
						<h3>File Content</h3>
					</div>
					<div
						id="file-content-display"
						class="file-content-display"
					>
						<p>No file loaded</p>
					</div>
				</div>
			</div>
		`;
	}

	showFileContent(content) {
		const display = this.container.querySelector('#file-content-display');
		if (display) {
			if (content) {
				display.innerHTML = `<pre>${content}</pre>`;
			} else {
				display.innerHTML = '<p>No file loaded</p>';
			}
		}
	}

	enableSaveButton() {
		const saveBtn = this.container.querySelector('#test-save-file');
		if (saveBtn) {
			saveBtn.disabled = false;
		}
	}

	disableSaveButton() {
		const saveBtn = this.container.querySelector('#test-save-file');
		if (saveBtn) {
			saveBtn.disabled = true;
		}
	}
}
