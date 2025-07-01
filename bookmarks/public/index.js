let bookmarks = [];

// DOM elements
const bookmarksGrid = document.getElementById('bookmarksGrid');
const addBookmarkModal = document.getElementById('addBookmarkModal');
const editBookmarkModal = document.getElementById('editBookmarkModal');
const addBookmarkForm = document.getElementById('addBookmarkForm');
const editBookmarkForm = document.getElementById('editBookmarkForm');

// Render a loading card with a centered spinner
function renderLoadingCard() {
	if (!bookmarksGrid) return;
	bookmarksGrid.innerHTML = `
		<div class="card loading-card">
			<div class="card-inner" style="justify-content:center;align-items:center;min-height:180px;">
				<div class="spinner"></div>
			</div>
		</div>
	`;
}

// Load bookmarks from API
async function loadBookmarks() {
	renderLoadingCard();
	try {
		const response = await fetch('/api/bookmarks');
		if (!response.ok) throw new Error('Failed to load bookmarks');
		bookmarks = await response.json();
		renderBookmarks(bookmarks);
	} catch (error) {
		console.error('Error loading bookmarks:', error);
		showError('Failed to load bookmarks');
	}
}

function isValidUrl(str) {
	try {
		new URL(str);
		return true;
	} catch {
		return false;
	}
}

document.addEventListener('DOMContentLoaded', function () {
	// Check for share target POST
	if (window.location.search.includes('share-target')) {
		// Not used, but for future query param detection
	}
	if (
		window.location.pathname === '/' &&
		window.location.search === '' &&
		window.location.hash === '' &&
		window.location.origin === window.location.origin
	) {
		// Try to read POSTed form data (only available if service worker intercepts and stores it)
		if ('serviceWorker' in navigator && 'caches' in window) {
			navigator.serviceWorker.ready.then(async (reg) => {
				if (reg.active && navigator.serviceWorker.controller) {
					navigator.serviceWorker.controller.postMessage({
						type: 'getShareData',
					});
				}
			});
			navigator.serviceWorker.addEventListener(
				'message',
				async (event) => {
					if (event.data && event.data.type === 'shareData') {
						const { title, text, url } = event.data;
						let urlValue = '';
						if (url && isValidUrl(url)) urlValue = url;
						else if (text && isValidUrl(text)) urlValue = text;
						else if (title && isValidUrl(title)) urlValue = title;
						if (urlValue) {
							try {
								const response = await fetch('/api/bookmarks', {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
									},
									body: JSON.stringify({
										url: urlValue,
										tags: '',
									}),
								});
								if (!response.ok) {
									const error = await response.json();
									throw new Error(
										error.error || 'Failed to add bookmark'
									);
								}
								const newBookmark = await response.json();
								bookmarks.unshift(newBookmark);
								renderBookmarks(bookmarks);
								showSuccess('Bookmark added successfully!');
							} catch (error) {
								console.error('Error adding bookmark:', error);
								showError(error.message);
							}
						}
					}
				}
			);
		}
	}
	loadBookmarks();
	setupEventListeners();
});

function setupEventListeners() {
	if (document.getElementById('addBookmarkBtn')) {
		document
			.getElementById('addBookmarkBtn')
			.addEventListener('click', showAddModal);
	}
	if (document.getElementById('cancelBtn')) {
		document
			.getElementById('cancelBtn')
			.addEventListener('click', hideAddModal);
	}
	if (document.getElementById('editCancelBtn')) {
		document
			.getElementById('editCancelBtn')
			.addEventListener('click', hideEditModal);
	}
	window.addEventListener('click', function (event) {
		if (event.target === addBookmarkModal) hideAddModal();
		if (event.target === editBookmarkModal) hideEditModal();
	});
	document.querySelectorAll('.close').forEach((closeBtn) => {
		closeBtn.addEventListener('click', function () {
			hideAddModal();
			hideEditModal();
		});
	});
	if (addBookmarkForm) {
		addBookmarkForm.addEventListener('submit', handleAddBookmark);
	}
	if (editBookmarkForm) {
		editBookmarkForm.addEventListener('submit', handleEditBookmark);
	}
}

// Show/hide loading overlay on add bookmark modal
function showAddModalLoading(show) {
	const modalContent = addBookmarkModal.querySelector('.modal-content');
	let overlay = document.getElementById('addModalLoading');
	if (show) {
		if (!overlay) {
			overlay = document.createElement('div');
			overlay.id = 'addModalLoading';
			overlay.className = 'modal-loading-overlay';
			overlay.innerHTML = '<div class="spinner"></div>';
			modalContent.appendChild(overlay);
		}
		overlay.style.display = 'flex';
	} else if (overlay) {
		overlay.style.display = 'none';
	}
}

// Handle add bookmark form submission
async function handleAddBookmark(event) {
	event.preventDefault();

	const url = document.getElementById('urlInput').value;
	const tags = document.getElementById('tagsInput').value;

	try {
		showAddModalLoading(true);
		const response = await fetch('/api/bookmarks', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ url, tags }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to add bookmark');
		}

		const newBookmark = await response.json();
		bookmarks.unshift(newBookmark);
		renderBookmarks(bookmarks);
		hideAddModal();
		showSuccess('Bookmark added successfully!');
	} catch (error) {
		console.error('Error adding bookmark:', error);
		showError(error.message);
	} finally {
		showAddModalLoading(false);
	}
}

// Handle edit bookmark form submission
async function handleEditBookmark(event) {
	event.preventDefault();

	const id = document.getElementById('editId').value;
	const title = document.getElementById('editTitle').value;
	const description = document.getElementById('editDescription').value;
	const tags = document.getElementById('editTags').value;
	const read_status = document.getElementById('editReadStatus').checked
		? 1
		: 0;
	const favorite = document.getElementById('editFavorite').checked ? 1 : 0;

	try {
		const response = await fetch(`/api/bookmarks/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				title,
				description,
				tags,
				read_status,
				favorite,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update bookmark');
		}

		const updatedBookmark = await response.json();
		const index = bookmarks.findIndex((b) => b.id === id);
		if (index !== -1) {
			bookmarks[index] = updatedBookmark;
			renderBookmarks(bookmarks);
		}

		hideEditModal();
		showSuccess('Bookmark updated successfully!');
	} catch (error) {
		console.error('Error updating bookmark:', error);
		showError(error.message);
	}
}

// Helper: map A-Z to a palette of 26 colors
const letterColors = [
	'#a87c02',
	'#DB4437',
	'#0F9D58',
	'#4285F4',
	'#AB47BC',
	'#00ACC1',
	'#FF7043',
	'#9E9D24',
	'#5C6BC0',
	'#F06292',
	'#00796B',
	'#C2185B',
	'#7E57C2',
	'#689F38',
	'#FBC02D',
	'#1976D2',
	'#388E3C',
	'#FFA000',
	'#0288D1',
	'#D32F2F',
	'#303F9F',
	'#C62828',
	'#00838F',
	'#F57C00',
	'#455A64',
	'#6D4C41',
];
function getColorForLetter(letter) {
	const idx = (letter.toUpperCase().charCodeAt(0) - 65) % 26;
	return letterColors[(idx + 26) % 26];
}

const formatBookmarkCard = (bookmark) => {
	let imageSrc = null;
	let imageAlt = bookmark.title || '';
	if (bookmark.image_storage_url) {
		imageSrc = bookmark.image_storage_url;
	} else if (bookmark.image_storage_url_present) {
		imageSrc = `/api/bookmarks/image/${bookmark.id}`;
	} else if (bookmark.image) {
		imageSrc = bookmark.image;
	}
	let imageHTML;
	if (imageSrc) {
		imageHTML = `<div class="card-image"><img src="${imageSrc}" alt="${imageAlt}" onerror="this.style.display='none'" /></div>`;
	} else {
		const firstLetter = (bookmark.title || '?').trim()[0] || '?';
		const color = getColorForLetter(firstLetter);
		imageHTML = `<div class="card-image placeholder" style="background:${color}"><span>${firstLetter.toUpperCase()}</span></div>`;
	}
	return `
    <div class="card" data-url="${escapeHtml(bookmark.url)}" data-id="${
		bookmark.id
	}" tabindex="0">
      <div class="card-inner">
        ${imageHTML}
        <div class="card-main">
          <div class="card-main-top">
            <div class="card-title-row">
              <h3 class="card-title">${bookmark.title || 'Untitled'}</h3>
            </div>
            <div class="card-desc">${bookmark.description || ''}</div>
          </div>
          <div class="card-footer">
            <div>
              <span class="card-domain">${getDomain(bookmark.url)}</span>
              <div class="card-meta-row">
                ${
					bookmark.tags
						? bookmark.tags
								.split(',')
								.filter((t) => t.trim())
								.map(
									(tag) =>
										`<span class="tag">${escapeHtml(
											tag.trim()
										)}</span>`
								)
								.join('')
						: ''
				}
                <span class="read-status-pill">${
					bookmark.read_status === 1 ? 'Read' : 'Unread'
				}</span>
              </div>
            </div>
            <div class="card-actions-row">
              <button class="btn btn-sm btn-secondary card-action-btn" onclick="editBookmark('${
					bookmark.id
				}')" title="Edit"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger card-action-btn" onclick="deleteBookmark('${
					bookmark.id
				}')" title="Delete"><i class="fas fa-trash"></i></button>
              ${getStarIcon(bookmark)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

function renderBookmarks(bookmarks) {
	if (!bookmarksGrid) return;
	if (!bookmarks || !bookmarks.length) {
		bookmarksGrid.innerHTML =
			'<div class="card no-data">No bookmarks</div>';
		return;
	}
	bookmarksGrid.innerHTML = bookmarks.map(formatBookmarkCard).join('');

	// Add click handler to each card
	document.querySelectorAll('.card').forEach((card) => {
		const isMobile = window.matchMedia('(max-width: 700px)').matches;
		const url = card.getAttribute('data-url');
		// Desktop: only image, title, desc are clickable
		if (!isMobile) {
			const clickableSelectors = [
				'.card-image',
				'.card-title',
				'.card-desc',
			];
			clickableSelectors.forEach((sel) => {
				const el = card.querySelector(sel);
				if (el) {
					el.style.cursor = 'pointer';
					el.addEventListener('click', function (e) {
						if (e.target.closest('.card-action-btn')) return;
						if (url) window.open(url, '_blank', 'noopener');
						e.stopPropagation();
					});
				}
			});
		} else {
			// Mobile: whole card except actions is clickable
			card.addEventListener('click', function (e) {
				if (e.target.closest('.card-action-btn')) {
					e.stopPropagation();
					e.preventDefault();
					return;
				}
				if (url) window.open(url, '_blank', 'noopener');
			});
			card.addEventListener('keydown', function (e) {
				if (
					(e.key === 'Enter' || e.key === ' ') &&
					!e.target.closest('.card-action-btn')
				) {
					if (url) window.open(url, '_blank', 'noopener');
				}
			});
		}
	});
}

// Modal logic
function showAddModal() {
	addBookmarkModal.style.display = 'block';
	document.getElementById('urlInput').focus();
}
function hideAddModal() {
	addBookmarkModal.style.display = 'none';
	addBookmarkForm.reset();
}
function showEditModal(bookmark) {
	document.getElementById('editId').value = bookmark.id;
	document.getElementById('editTitle').value = bookmark.title || '';
	document.getElementById('editDescription').value =
		bookmark.description || '';
	document.getElementById('editTags').value = bookmark.tags || '';
	document.getElementById('editReadStatus').checked =
		bookmark.read_status === 1;
	document.getElementById('editFavorite').checked = bookmark.favorite === 1;
	editBookmarkModal.style.display = 'block';
}
function hideEditModal() {
	editBookmarkModal.style.display = 'none';
	editBookmarkForm.reset();
}

// Utility: format date
function formatDate(dateString) {
	const date = new Date(dateString);
	const now = new Date();
	const diffTime = Math.abs(now - date);
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	if (diffDays === 1) return 'yesterday';
	if (diffDays < 7) return `${diffDays} days ago`;
	return date.toLocaleDateString();
}

// Expose edit/delete for inline buttons
window.editBookmark = function (id) {
	// Find bookmark by id and show edit modal
	const bookmark = bookmarks.find((b) => b.id == id);
	if (bookmark) showEditModal(bookmark);
};

function showCardLoadingOverlay(cardId, show) {
	const card =
		document.querySelector(`.card[data-url][data-id='${cardId}']`) ||
		document.querySelector(`.card[data-id='${cardId}']`);
	if (!card) return;
	let overlay = card.querySelector('.card-loading-overlay');
	if (show) {
		if (!overlay) {
			overlay = document.createElement('div');
			overlay.className = 'card-loading-overlay';
			overlay.innerHTML = '<div class="spinner"></div>';
			card.appendChild(overlay);
		}
		overlay.style.display = 'flex';
	} else if (overlay) {
		overlay.style.display = 'none';
	}
}

// Delete bookmark
async function deleteBookmark(id) {
	if (!confirm('Are you sure you want to delete this bookmark?')) {
		return;
	}
	// Find the delete button for this card and disable it
	const btn = document.querySelector(
		`button[onclick="deleteBookmark('${id}')"]`
	);
	if (btn) {
		btn.disabled = true;
		btn.textContent = '...';
	}
	try {
		showCardLoadingOverlay(id, true);
		const response = await fetch(`/api/bookmarks/${id}`, {
			method: 'DELETE',
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to delete bookmark');
		}
		bookmarks = bookmarks.filter((b) => b.id != id);
		renderBookmarks(bookmarks);
		showSuccess('Bookmark deleted successfully!');
	} catch (error) {
		console.error('Error deleting bookmark:', error);
		showError(error.message);
	} finally {
		showCardLoadingOverlay(id, false);
		if (btn) {
			btn.disabled = false;
			btn.textContent = '';
			const icon = document.createElement('i');
			icon.className = 'fas fa-trash';
			btn.appendChild(icon);
		}
	}
}

// Toast notification system
function showToast(message, type = 'success') {
	let toast = document.getElementById('toast');
	if (!toast) {
		toast = document.createElement('div');
		toast.id = 'toast';
		document.body.appendChild(toast);
	}
	toast.className = `toast toast-${type}`;
	toast.textContent = message;
	// Force reflow to restart animation
	void toast.offsetWidth;
	toast.classList.add('toast-show');
	setTimeout(() => {
		toast.classList.remove('toast-show');
	}, 2000);
}

function showSuccess(message) {
	showToast(message, 'success');
}
function showError(message) {
	showToast(message, 'error');
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

// Make functions globally available for onclick handlers
window.showAddModal = showAddModal;
window.editBookmark = editBookmark;
window.deleteBookmark = deleteBookmark;

window.toggleFavorite = async function (id) {
	const bookmark = bookmarks.find((b) => b.id == id);
	if (!bookmark) return;
	const newFavorite =
		bookmark.favorite === 1 || bookmark.favorite === true ? 0 : 1;
	try {
		const response = await fetch(`/api/bookmarks/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ favorite: newFavorite }),
		});
		if (!response.ok) throw new Error('Failed to update favorite');
		bookmark.favorite = newFavorite;
		renderBookmarks(bookmarks);
	} catch (e) {
		showError('Could not update favorite');
	}
};

// Utility: extract domain from URL
function getDomain(url) {
	try {
		const urlObj = new URL(url);
		return urlObj.hostname.replace(/^www\./, '');
	} catch (e) {
		return url;
	}
}

// Utility: get star icon HTML for favorite button
function getStarIcon(bookmark) {
	const isFavorite = bookmark.favorite === 1 || bookmark.favorite === true;
	return isFavorite
		? `<button class="btn btn-sm card-action-btn favorite-btn" title="Unfavorite" onclick="toggleFavorite('${bookmark.id}')"><i class="fas fa-star"></i></button>`
		: `<button class="btn btn-sm card-action-btn favorite-btn" title="Favorite" onclick="toggleFavorite('${bookmark.id}')"><i class="far fa-star"></i></button>`;
}
