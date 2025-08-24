import { $ } from '../utils/utils.js';

// Room List Component - Shows available rooms when no room is joined
export class RoomList {
	constructor() {
		this.rooms = ['public', 'super-duper'];
		this.container = null;
	}

	// Show the room list
	show() {
		// Use the static room list that's already in the HTML
		const staticRoomList = document.getElementById('roomList');
		if (staticRoomList) {
			staticRoomList.style.display = 'block';
		} else {
			// Fallback to dynamic creation if static list doesn't exist
			if (!this.container) {
				this.createRoomList();
			}
			this.container.style.display = 'block';
		}
	}

	// Hide the room list
	hide() {
		// Hide the static room list
		const staticRoomList = document.getElementById('roomList');
		if (staticRoomList) {
			staticRoomList.style.display = 'none';
		}
		
		// Also hide the dynamic container if it exists
		if (this.container) {
			this.container.style.display = 'none';
		}

		// Note: Do NOT automatically show edit/graph panels here
		// They should only be shown when a room is actually joined
		// This prevents showing empty panels before the room data is loaded
	}

	// Hide the edit and graph panels
	hideEditAndGraphPanels() {
		const editPanel = document.querySelector('.card:nth-child(1)'); // Edit panel
		const graphPanel = document.querySelector('.card:nth-child(2)'); // Graph panel

		if (editPanel) editPanel.style.display = 'none';
		if (graphPanel) graphPanel.style.display = 'none';
	}

	// Show the edit and graph panels
	showEditAndGraphPanels() {
		const editPanel = document.querySelector('.card:nth-child(1)'); // Edit panel
		const graphPanel = document.querySelector('.card:nth-child(2)'); // Graph panel

		if (editPanel) editPanel.style.display = 'block';
		if (graphPanel) graphPanel.style.display = 'block';
	}

	// Create the room list HTML
	createRoomList() {
		this.container = document.createElement('div');
		this.container.id = 'roomList';
		this.container.className = 'room-list';

		const html = `
			<div class="room-list-header">
				<h2>Select a Room</h2>
				<p>Choose a room to join and start collaborating</p>
			</div>
			<div class="room-grid">
				${this.rooms
					.map(
						(room) => `
					<div class="room-card" data-room="${room}">
						<div class="room-icon">📊</div>
						<h3>${room}</h3>
						<p>Join this room to start working</p>
						<button class="join-room-btn" data-room="${room}">Join Room</button>
					</div>
				`
					)
					.join('')}
			</div>
		`;

		this.container.innerHTML = html;

		// Insert into the grid layout - find the first card element and insert before it
		const gridContainer = document.querySelector('.grid');
		if (gridContainer) {
			const firstCard = gridContainer.querySelector('.card');
			if (firstCard) {
				gridContainer.insertBefore(this.container, firstCard);
			} else {
				// If no cards found, append to the end
				gridContainer.appendChild(this.container);
			}
		}

		// Add event listeners
		this.setupEventListeners();
	}

	// Setup event listeners for room selection
	setupEventListeners() {
		const joinButtons = this.container.querySelectorAll('.join-room-btn');
		joinButtons.forEach((button) => {
			button.addEventListener('click', (e) => {
				const roomName = e.target.dataset.room;
				this.joinRoom(roomName);
			});
		});
	}

	// Join the selected room
	joinRoom(roomName) {
		// Use the global joinRoom function
		if (window.joinRoom) {
			window.joinRoom(roomName);
		}
	}
}
