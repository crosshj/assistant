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
						</div>
					</div>

					<div class="test-section">
						<h3>Database Operations</h3>
						<div class="test-buttons">
							<button
								id="test-insert-data"
								class="test-btn"
								disabled
							>
								Insert Data
							</button>
							<button
								id="test-update-data"
								class="test-btn"
								disabled
							>
								Update Data
							</button>
							<button
								id="test-delete-data"
								class="test-btn"
								disabled
							>
								Delete Data
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

	enableDatabaseOperationButtons() {
		const buttons = this.container.querySelectorAll(
			'#test-insert-data, #test-update-data, #test-delete-data'
		);
		buttons.forEach((btn) => {
			btn.disabled = false;
		});
	}

	showDatabaseState({ action, state, metadata, message }) {
		const display = this.container.querySelector('#file-content-display');
		if (display) {
			// Get appropriate header based on action
			let header = 'Database State';
			if (action === 'file_opened') header = 'Database Loaded';
			else if (action === 'item_inserted') header = 'Item Inserted';
			else if (action === 'item_updated') header = 'Item Updated';
			else if (action === 'item_deleted') header = 'Item Deleted';
			else if (action === 'file_saved') header = 'File Saved';

			display.innerHTML = html`
				<div class="database-results">
					<h4>${header}</h4>
					<p><strong>Message:</strong> ${message}</p>
					${metadata
						? html`
								<div class="table-results">
									<h5>Metadata</h5>
									<p>
										<strong>Version:</strong>
										${metadata.version}
									</p>
									<pre><code>${JSON.stringify(
										metadata.schema,
										null,
										2
									)}</code></pre>
								</div>
						  `
						: ''}
					${Object.entries(state || {})
						.map(
							([tableName, tableResults]) => html`
								<div class="table-results">
									<h5>Table: ${tableName}</h5>
									${tableResults.error
										? `<p style="color: red;">Error: ${tableResults.error}</p>`
										: html`
												<p>
													<strong>Rows:</strong>
													${tableResults.length}
												</p>
												<pre><code>${JSON.stringify(
													tableResults,
													null,
													2
												)}</code></pre>
										  `}
								</div>
							`
						)
						.join('')}
				</div>
			`;
		}
	}

	showDatabaseError(error) {
		const display = this.container.querySelector('#file-content-display');
		if (display) {
			display.innerHTML = html`
				<div class="database-error">
					<h4>Database Error</h4>
					<p style="color: red;">${error}</p>
				</div>
			`;
		}
	}
}
