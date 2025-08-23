import Gun from 'gun';
import 'gun/sea';
import 'gun/axe';
import { log, $ } from '../utils/utils.js';

// GunDB Connection Management
export class GunConnection {
	constructor() {
		this.gun = null;
		this.user = null;
		this.peers = [];
		this.connectionStatus = { connected: 0, total: 0 };
	}

	init(peers = []) {
		this.peers = peers.length ? peers : this.getDefaultPeers();

		this.gun = Gun({
			peers: this.peers,
			localStorage: true,
		});

		this.user = this.gun.user();
		this.autoLogin();
		this.monitorConnections();

		log(
			'gun init with ' +
				Object.keys(this.gun.back('opt.peers') || {}).length +
				' peers'
		);

		return this.gun;
	}

	getDefaultPeers() {
		return [
			'https://gun-manhattan.herokuapp.com/gun',
			'https://gun-us.herokuapp.com/gun',
			'https://gun-eu.herokuapp.com/gun',
		];
	}

	autoLogin() {
		const saved = this.tryJSON(localStorage.getItem('gun_demo_creds'));
		if (saved) {
			this.user.auth(saved.alias, saved.pass, () => {
				$('whoami').textContent = saved.alias;
				log('auto login ' + saved.alias);
			});
		}
	}

	tryJSON(t, d) {
		try {
			return t ? JSON.parse(t) : d;
		} catch {
			return d;
		}
	}

	monitorConnections() {
		let lastStatus = null;

		// Check connection status every 30 seconds
		setInterval(() => {
			const peers = this.gun.back('opt.peers') || {};
			const peerCount = Object.keys(peers).length;
			const connectedPeers = Object.values(peers).filter(
				(peer) =>
					peer && peer.url && peer.wire && peer.wire.readyState === 1
			).length;

			const currentStatus = `${connectedPeers}/${peerCount}`;

			// Only log if status changed AND we're connected
			if (currentStatus !== lastStatus) {
				this.updateConnectionStatus(connectedPeers, peerCount);

				// Only log disconnections, not connections
				if (connectedPeers === 0 && lastStatus !== null) {
					log('⚠️ Lost connection to all peers');
				} else if (connectedPeers > 0 && lastStatus === '0/0') {
					log('✅ Reconnected to peers');
					// Reset connection error flag when reconnected
					window.connectionErrorShown = false;
				}

				lastStatus = currentStatus;
			} else {
				// Update visual status without logging
				this.updateConnectionStatus(connectedPeers, peerCount);
			}
		}, 30000);

		// Initial check (silent)
		setTimeout(() => this.monitorConnections(), 1000);
	}

	updateConnectionStatus(connected, total) {
		this.connectionStatus = { connected, total };
		const statusEl = $('roomStatus');

		if (connected === 0) {
			statusEl.textContent = '⚠️ Disconnected';
			statusEl.style.color = '#ff6b6b';
			statusEl.style.borderColor = '#ff6b6b';
			statusEl.title =
				'No peer connections available - Click "Test Connection" for details';
		} else if (connected < total) {
			statusEl.textContent = `⚠️ ${connected}/${total} peers`;
			statusEl.style.color = '#ffa726';
			statusEl.style.borderColor = '#ffa726';
			statusEl.title = `${connected} of ${total} peers connected - Partial connection`;
		} else {
			statusEl.textContent = `✅ ${connected}/${total} peers`;
			statusEl.style.color = '#66bb6a';
			statusEl.style.borderColor = '#66bb6a';
			statusEl.title = `All ${connected} peers connected - Ready for operations`;
		}
	}

	getConnectionStatus() {
		return this.connectionStatus;
	}

	isConnected() {
		return this.connectionStatus.connected > 0;
	}

	testConnection() {
		const peers = this.gun.back('opt.peers') || {};
		const peerCount = Object.keys(peers).length;
		const connectedPeers = Object.values(peers).filter(
			(peer) =>
				peer && peer.url && peer.wire && peer.wire.readyState === 1
		).length;

		log(
			`📊 Manual Connection Check: ${connectedPeers}/${peerCount} peers connected`
		);

		if (connectedPeers === 0) {
			log('❌ No peers connected. Try updating peer URLs.');
			log('💡 Tip: Use public GunDB peers like:');
			log('   https://gun-manhattan.herokuapp.com/gun');
			log('   https://gun-us.herokuapp.com/gun');
		} else {
			log('✅ Connection looks good! Graph operations should work.');
		}
	}

	updatePeers(peers) {
		if (peers.length === 0) {
			log('⚠️ Please enter at least one peer URL');
			return false;
		}

		log('🔄 Connecting to peers: ' + peers.join(', '));
		this.init(peers);
		return true;
	}
}
