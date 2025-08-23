import { NetworkUI } from '../../controllers/NetworkUI.js';
import { RoomUI } from '../../controllers/RoomUI.js';

// Header Component - Top navigation and connection controls
export class Header {
	constructor(connection, auth, stateManager) {
		this.connection = connection;
		this.auth = auth;
		this.stateManager = stateManager;

		// UI controllers (pure rendering, no logic)
		this.networkUI = new NetworkUI();
		this.roomUI = new RoomUI();

		// Listen to state changes
		this.stateManager.on('stateChanged', (state) => {
			this.render(state);
		});
	}

	setupEventHandlers() {
		// Room Management - Emit UI events only
		$('join').onclick = () => {
			const state = this.stateManager.getState();
			if (state.room.status === 'joined') {
				// Emit leave room event
				document.dispatchEvent(new CustomEvent('ui:leaveRoom'));
			} else if (state.room.canJoin) {
				const roomName = $('room').value.trim() || 'public';
				// Emit join room event
				document.dispatchEvent(
					new CustomEvent('ui:joinRoom', {
						detail: roomName,
					})
				);
			}
		};

		// Network/Connection Management - Emit UI events only
		$('connectBtn').onclick = () => {
			document.dispatchEvent(new CustomEvent('ui:connect'));
		};

		$('disconnectBtn').onclick = () => {
			document.dispatchEvent(new CustomEvent('ui:disconnect'));
		};

		$('testConnection').onclick = () => {
			document.dispatchEvent(new CustomEvent('ui:testConnection'));
		};

		// Authentication/Identity Management
		$('createPair').onclick = () => {
			const alias =
				$('alias').value || `u_${this.generateId().slice(0, 6)}`;
			document.dispatchEvent(
				new CustomEvent('ui:createIdentity', {
					detail: alias,
				})
			);
		};

		$('login').onclick = () => {
			const saved = tryJSON(localStorage.getItem('gun_demo_creds'));
			if (saved) {
				document.dispatchEvent(
					new CustomEvent('ui:login', {
						detail: { alias: saved.alias, password: saved.pass },
					})
				);
				return;
			}
			const alias = $('alias').value.trim();
			if (!alias) {
				log('set alias or create identity');
				return;
			}
			const pass = prompt('Password for ' + alias + ':');
			document.dispatchEvent(
				new CustomEvent('ui:login', {
					detail: { alias: alias, password: pass },
				})
			);
		};
	}

	setInitialValues() {
		$('peers').value = this.connection.getDefaultPeers().join(',');
		// Render initial state
		this.render(this.stateManager.getState());
	}

	// Single render method - delegates to UI controllers
	render(state) {
		// Render network UI
		this.networkUI.render(state.network);

		// Render room UI
		this.roomUI.render(state.room, state.room.canJoin);

		// Update auth display (simple, no controller needed yet)
		$('whoami').textContent = state.auth.alias;

		// Control visibility of room and auth sections based on network state
		this._updateSectionVisibility(state.network);
	}

	generateId() {
		return crypto.randomUUID
			? crypto.randomUUID()
			: Math.random().toString(16).slice(2) + Date.now().toString(16);
	}

	// Control visibility of room and auth sections based on network state
	_updateSectionVisibility(networkState) {
		const roomSection = document.getElementById('roomSection');
		const roomDivider = document.getElementById('roomDivider');
		const authSection = document.getElementById('authSection');

		// Show room and auth sections when connected (partial or full connection)
		const isConnected =
			networkState.status === 'partial' ||
			networkState.status === 'connected';

		if (roomSection) {
			roomSection.style.visibility = isConnected ? 'visible' : 'hidden';
		}
		if (roomDivider) {
			roomDivider.style.visibility = isConnected ? 'visible' : 'hidden';
		}
		if (authSection) {
			authSection.style.visibility = isConnected ? 'visible' : 'hidden';
		}
	}
}

// Helper functions
const $ = (id) => document.getElementById(id);
const tryJSON = (t, d) => {
	try {
		return t ? JSON.parse(t) : d;
	} catch {
		return d;
	}
};
