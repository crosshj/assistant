// Header Component - Top navigation and connection controls
export class Header {
	constructor(connection, auth) {
		this.connection = connection;
		this.auth = auth;
	}

	setupEventHandlers() {
		// Connection controls
		$('applyPeers').onclick = () => {
			const peers = $('peers')
				.value.split(',')
				.map((s) => s.trim())
				.filter(Boolean);

			if (this.connection.updatePeers(peers)) {
				// Update room status if we're in a room
				if (window.currentRoom) {
					setTimeout(() => {
						if (this.connection.isConnected()) {
							log('✅ Reconnected! Room data should sync now.');
							// Trigger room refresh
							window.refreshRoom && window.refreshRoom();
						}
					}, 2000);
				}
			}
		};

		$('testConnection').onclick = () => {
			this.connection.testConnection();
		};

		// Authentication controls
		$('createPair').onclick = () => {
			const alias =
				$('alias').value || `u_${this.generateId().slice(0, 6)}`;
			this.auth.createIdentity(alias);
		};

		$('login').onclick = () => {
			const saved = tryJSON(localStorage.getItem('gun_demo_creds'));
			if (saved) {
				this.auth.login(saved.alias, saved.pass);
				return;
			}
			const alias = $('alias').value.trim();
			if (!alias) {
				log('set alias or create identity');
				return;
			}
			const pass = prompt('Password for ' + alias + ':');
			this.auth.login(alias, pass);
		};

		// Room controls
		$('join').onclick = () => {
			const room = $('room').value.trim() || 'public';
			window.joinRoom && window.joinRoom(room);
		};
	}

	setInitialValues() {
		$('peers').value = this.connection.getDefaultPeers().join(',');
	}

	generateId() {
		return crypto.randomUUID
			? crypto.randomUUID()
			: Math.random().toString(16).slice(2) + Date.now().toString(16);
	}
}

// Helper functions
const $ = (id) => document.getElementById(id);
const log = (msg) => {
	const li = document.createElement('li');
	li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
	$('log').prepend(li);
	console.log(msg);
};
const tryJSON = (t, d) => {
	try {
		return t ? JSON.parse(t) : d;
	} catch {
		return d;
	}
};
