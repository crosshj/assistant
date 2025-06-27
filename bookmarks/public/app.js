// Global variables
let bookmarks = [];
let tags = [];

// DOM elements
const bookmarksGrid = document.getElementById('bookmarksGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const tagFilter = document.getElementById('tagFilter');
const statusFilter = document.getElementById('statusFilter');
const favoriteFilter = document.getElementById('favoriteFilter');
const sortBy = document.getElementById('sortBy');

// Modal elements
const addBookmarkModal = document.getElementById('addBookmarkModal');
const editBookmarkModal = document.getElementById('editBookmarkModal');
const addBookmarkForm = document.getElementById('addBookmarkForm');
const editBookmarkForm = document.getElementById('editBookmarkForm');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadBookmarks();
    loadTags();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Search and filter events
    searchInput.addEventListener('input', debounce(loadBookmarks, 300));
    tagFilter.addEventListener('change', loadBookmarks);
    statusFilter.addEventListener('change', loadBookmarks);
    favoriteFilter.addEventListener('change', loadBookmarks);
    sortBy.addEventListener('change', loadBookmarks);

    // Modal events
    document.getElementById('addBookmarkBtn').addEventListener('click', showAddModal);
    document.getElementById('cancelBtn').addEventListener('click', hideAddModal);
    document.getElementById('editCancelBtn').addEventListener('click', hideEditModal);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === addBookmarkModal) {
            hideAddModal();
        }
        if (event.target === editBookmarkModal) {
            hideEditModal();
        }
    });

    // Close modals with X button
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            hideAddModal();
            hideEditModal();
        });
    });

    // Form submissions
    addBookmarkForm.addEventListener('submit', handleAddBookmark);
    editBookmarkForm.addEventListener('submit', handleEditBookmark);
}

// Load bookmarks from API
async function loadBookmarks() {
    showLoading();
    
    try {
        const params = new URLSearchParams();
        
        if (searchInput.value) params.append('search', searchInput.value);
        if (tagFilter.value) params.append('tag', tagFilter.value);
        if (statusFilter.value !== '') params.append('read', statusFilter.value);
        if (favoriteFilter.value !== '') params.append('favorite', favoriteFilter.value);
        if (sortBy.value) {
            params.append('sort', sortBy.value);
            params.append('order', 'DESC');
        }
        
        const response = await fetch(`/api/bookmarks?${params}`);
        if (!response.ok) throw new Error('Failed to load bookmarks');
        
        bookmarks = await response.json();
        renderBookmarks();
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        showError('Failed to load bookmarks');
    } finally {
        hideLoading();
    }
}

// Load tags from API
async function loadTags() {
    try {
        const response = await fetch('/api/tags');
        if (!response.ok) throw new Error('Failed to load tags');
        
        tags = await response.json();
        populateTagFilter();
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

// Populate tag filter dropdown
function populateTagFilter() {
    tagFilter.innerHTML = '<option value="">All Tags</option>';
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });
}

// Render bookmarks in the grid
function renderBookmarks() {
    if (bookmarks.length === 0) {
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    
    bookmarksGrid.innerHTML = bookmarks.map(bookmark => `
        <div class="bookmark-card" data-id="${bookmark.id}">
            <div class="bookmark-image">
                ${bookmark.image ? 
                    `<img src="${bookmark.image}" alt="${bookmark.title}" onerror="this.style.display='none'">` : 
                    '<i class="fas fa-globe"></i>'
                }
            </div>
            <div class="bookmark-content">
                <h3 class="bookmark-title">${escapeHtml(bookmark.title || 'Untitled')}</h3>
                <p class="bookmark-description">${escapeHtml(bookmark.description || 'No description available')}</p>
                <a href="${bookmark.url}" target="_blank" class="bookmark-url">${bookmark.url}</a>
                
                ${bookmark.tags ? `
                    <div class="bookmark-tags">
                        ${bookmark.tags.split(',').map(tag => 
                            `<span class="tag">${escapeHtml(tag.trim())}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                
                <div class="bookmark-actions">
                    <div class="bookmark-status">
                        <span class="status-badge ${bookmark.read_status ? 'status-read' : 'status-unread'}">
                            ${bookmark.read_status ? 'Read' : 'Unread'}
                        </span>
                        ${bookmark.favorite ? '<span class="status-badge favorite-badge">Favorite</span>' : ''}
                    </div>
                    <div class="bookmark-actions-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="editBookmark('${bookmark.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteBookmark('${bookmark.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="bookmark-date">
                    Added ${formatDate(bookmark.created_at)}
                </div>
            </div>
        </div>
    `).join('');
}

// Show add bookmark modal
function showAddModal() {
    addBookmarkModal.style.display = 'block';
    document.getElementById('urlInput').focus();
}

// Hide add bookmark modal
function hideAddModal() {
    addBookmarkModal.style.display = 'none';
    addBookmarkForm.reset();
}

// Show edit bookmark modal
function showEditModal(bookmark) {
    document.getElementById('editId').value = bookmark.id;
    document.getElementById('editTitle').value = bookmark.title || '';
    document.getElementById('editDescription').value = bookmark.description || '';
    document.getElementById('editTags').value = bookmark.tags || '';
    document.getElementById('editReadStatus').checked = bookmark.read_status === 1;
    document.getElementById('editFavorite').checked = bookmark.favorite === 1;
    
    editBookmarkModal.style.display = 'block';
}

// Hide edit bookmark modal
function hideEditModal() {
    editBookmarkModal.style.display = 'none';
    editBookmarkForm.reset();
}

// Handle add bookmark form submission
async function handleAddBookmark(event) {
    event.preventDefault();
    
    const url = document.getElementById('urlInput').value;
    const tags = document.getElementById('tagsInput').value;
    
    try {
        const response = await fetch('/api/bookmarks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, tags })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add bookmark');
        }
        
        const newBookmark = await response.json();
        bookmarks.unshift(newBookmark);
        renderBookmarks();
        hideAddModal();
        loadTags(); // Refresh tags
        
        showSuccess('Bookmark added successfully!');
    } catch (error) {
        console.error('Error adding bookmark:', error);
        showError(error.message);
    }
}

// Handle edit bookmark form submission
async function handleEditBookmark(event) {
    event.preventDefault();
    
    const id = document.getElementById('editId').value;
    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    const tags = document.getElementById('editTags').value;
    const read_status = document.getElementById('editReadStatus').checked ? 1 : 0;
    const favorite = document.getElementById('editFavorite').checked ? 1 : 0;
    
    try {
        const response = await fetch(`/api/bookmarks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, description, tags, read_status, favorite })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update bookmark');
        }
        
        const updatedBookmark = await response.json();
        const index = bookmarks.findIndex(b => b.id === id);
        if (index !== -1) {
            bookmarks[index] = updatedBookmark;
            renderBookmarks();
        }
        
        hideEditModal();
        loadTags(); // Refresh tags
        
        showSuccess('Bookmark updated successfully!');
    } catch (error) {
        console.error('Error updating bookmark:', error);
        showError(error.message);
    }
}

// Edit bookmark
async function editBookmark(id) {
    const bookmark = bookmarks.find(b => b.id === id);
    if (bookmark) {
        showEditModal(bookmark);
    }
}

// Delete bookmark
async function deleteBookmark(id) {
    if (!confirm('Are you sure you want to delete this bookmark?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bookmarks/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete bookmark');
        }
        
        bookmarks = bookmarks.filter(b => b.id !== id);
        renderBookmarks();
        
        showSuccess('Bookmark deleted successfully!');
    } catch (error) {
        console.error('Error deleting bookmark:', error);
        showError(error.message);
    }
}

// Utility functions
function showLoading() {
    loadingSpinner.style.display = 'block';
    bookmarksGrid.style.display = 'none';
    emptyState.style.display = 'none';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
    bookmarksGrid.style.display = 'grid';
}

function showEmptyState() {
    emptyState.style.display = 'block';
    bookmarksGrid.style.display = 'none';
}

function hideEmptyState() {
    emptyState.style.display = 'none';
    bookmarksGrid.style.display = 'grid';
}

function showError(message) {
    // Simple error notification - you could enhance this with a proper toast library
    alert('Error: ' + message);
}

function showSuccess(message) {
    // Simple success notification - you could enhance this with a proper toast library
    alert('Success: ' + message);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
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