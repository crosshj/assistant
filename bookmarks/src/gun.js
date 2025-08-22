import './gun.css';
import Gun from 'gun';
import 'gun/sea';
import 'gun/axe';
import cytoscape from 'cytoscape';

// GunDB Collaborative Graph Application

// Show content once styles are loaded to prevent FOUC
document.body.classList.add('styles-loaded');
const $ = (id) => document.getElementById(id);
const log = (msg) => {
	const li = document.createElement('li');
	li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
	$('log').prepend(li);
	console.log(msg);
};
const uuid = () =>
	crypto.randomUUID
		? crypto.randomUUID()
		: Math.random().toString(16).slice(2) + Date.now().toString(16);
const tryJSON = (t, d) => {
	try {
		return t ? JSON.parse(t) : d;
	} catch {
		return d;
	}
};

let gun, user;
let currentRoom = null;
let graphRoot = null;
let nodesChain = null,
	edgesChain = null;

const DEFAULT_PEERS = [
	'https://gun-manhattan.herokuapp.com/gun',
	'https://gun-us.herokuapp.com/gun',
	'https://gun-eu.herokuapp.com/gun',
];

function autoLogin() {
	const saved = tryJSON(localStorage.getItem('gun_demo_creds'));
	if (saved) {
		user.auth(saved.alias, saved.pass, () => {
			$('whoami').textContent = saved.alias;
			log('auto login ' + saved.alias);
		});
	}
}

function initGun(peers) {
	gun = Gun({
		peers: peers && peers.length ? peers : DEFAULT_PEERS,
		localStorage: true,
	});
	user = gun.user();
	autoLogin();

	// Monitor peer connections
	monitorConnections();

	log(
		'gun init with ' +
			Object.keys(gun.back('opt.peers') || {}).length +
			' peers'
	);
}

function monitorConnections() {
	let lastStatus = null;

	// Check connection status every 30 seconds (much less frequent)
	setInterval(() => {
		const peers = gun.back('opt.peers') || {};
		const peerCount = Object.keys(peers).length;
		const connectedPeers = Object.values(peers).filter(
			(peer) =>
				peer && peer.url && peer.wire && peer.wire.readyState === 1
		).length;

		const currentStatus = `${connectedPeers}/${peerCount}`;

		// Only log if status changed AND we're connected
		if (currentStatus !== lastStatus) {
			updateConnectionStatus(connectedPeers, peerCount);

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
			updateConnectionStatus(connectedPeers, peerCount);
		}
	}, 30000);

	// Initial check (silent)
	setTimeout(() => monitorConnections(), 1000);
}

function updateConnectionStatus(connected, total) {
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

function joinRoom(room) {
	if (!room) return;

	// Check if we have any peer connections
	const peers = gun.back('opt.peers') || {};
	const connectedPeers = Object.values(peers).filter(
		(peer) => peer && peer.url && peer.wire && peer.wire.readyState === 1
	).length;

	if (connectedPeers === 0) {
		// Only show this error once per session
		if (!window.connectionErrorShown) {
			log('⚠️ Cannot join room: No peer connections available');
			window.connectionErrorShown = true;
		}
		$('roomStatus').textContent = '⚠️ No connection';
		return;
	}

	currentRoom = room;
	graphRoot = gun.get('graphs').get(room);
	$('roomStatus').textContent = `📊 ${room}`;
	subscribeRoom();
	log(
		'joined room ' + room + ' with ' + connectedPeers + ' peer connections'
	);
}

function upsertNode({ id, label, props }) {
	if (!graphRoot) {
		log('⚠️ Cannot create node: Not in a room');
		return;
	}

	// Check connection status
	const peers = gun.back('opt.peers') || {};
	const connectedPeers = Object.values(peers).filter(
		(peer) => peer && peer.url && peer.wire && peer.wire.readyState === 1
	).length;

	if (connectedPeers === 0) {
		// Only show this error once per session
		if (!window.connectionErrorShown) {
			log('⚠️ Cannot create node: No peer connections available');
			window.connectionErrorShown = true;
		}
		return;
	}

	const nid = id || uuid();
	const node = {
		id: nid,
		label: label || '',
		props: props || {},
		updatedAt: Date.now(),
		by: (user.is && user.is.alias) || 'anon',
	};

	try {
		graphRoot.get('nodes').get(nid).put(node);
		log('✅ Node created: ' + nid);
	} catch (error) {
		log('❌ Failed to create node: ' + error.message);
	}
}

function deleteNode(id) {
	if (!graphRoot || !id) return;
	graphRoot.get('nodes').get(id).put(null);
	log('node deleted ' + id);
}

function upsertEdge({ id, from, to, label, props }) {
	if (!graphRoot) {
		log('⚠️ Cannot create edge: Not in a room');
		return;
	}
	if (!from || !to) {
		log('⚠️ Cannot create edge: Missing from/to nodes');
		return;
	}

	// Check connection status
	const peers = gun.back('opt.peers') || {};
	const connectedPeers = Object.values(peers).filter(
		(peer) => peer && peer.url && peer.wire && peer.wire.readyState === 1
	).length;

	if (connectedPeers === 0) {
		// Only show this error once per session
		if (!window.connectionErrorShown) {
			log('⚠️ Cannot create edge: No peer connections available');
			window.connectionErrorShown = true;
		}
		return;
	}

	const eid = id || uuid();
	const edge = {
		id: eid,
		from,
		to,
		label: label || '',
		props: props || {},
		updatedAt: Date.now(),
		by: (user.is && user.is.alias) || 'anon',
	};

	try {
		graphRoot.get('edges').get(eid).put(edge);
		log('✅ Edge created: ' + eid);
	} catch (error) {
		log('❌ Failed to create edge: ' + error.message);
	}
}

function deleteEdge(id) {
	if (!graphRoot || !id) return;
	graphRoot.get('edges').get(id).put(null);
	log('edge deleted ' + id);
}

// Export room data function
async function exportRoom(room) {
	if (!room) return null;
	const nodes = {};
	const edges = {};

	return new Promise((resolve) => {
		const graphRoot = gun.get('graphs').get(room);
		const nodesChain = graphRoot.get('nodes').map();
		const edgesChain = graphRoot.get('edges').map();

		let nodeCount = 0;
		let edgeCount = 0;

		nodesChain.on((data, id) => {
			if (data) {
				nodes[id] = data;
				nodeCount++;
			}
		});

		edgesChain.on((data, id) => {
			if (data) {
				edges[id] = data;
				edgeCount++;
			}
		});

		// Wait a bit for data to load, then resolve
		setTimeout(() => {
			log(
				`Exporting ${nodeCount} nodes and ${edgeCount} edges from room: ${room}`
			);
			resolve({
				room,
				nodes,
				edges,
				metadata: {
					exportedAt: new Date().toISOString(),
					nodeCount,
					edgeCount,
				},
			});
		}, 1000);
	});
}

function subscribeRoom() {
	if (!cy) {
		log('⚠️ Cytoscape not initialized yet');
		return;
	}

	cy.elements().remove();
	if (nodesChain) nodesChain.off();
	if (edgesChain) edgesChain.off();

	// Check connection before subscribing
	const peers = gun.back('opt.peers') || {};
	const connectedPeers = Object.values(peers).filter(
		(peer) => peer && peer.url && peer.wire && peer.wire.readyState === 1
	).length;

	if (connectedPeers === 0) {
		// Only show this error once per session
		if (!window.connectionErrorShown) {
			log('⚠️ Cannot subscribe: No peer connections available');
			window.connectionErrorShown = true;
		}
		return;
	}

	nodesChain = graphRoot.get('nodes').map();
	edgesChain = graphRoot.get('edges').map();
	nodesChain.on((data, id) => {
		try {
			if (!data) {
				const ele = cy.getElementById('n_' + id);
				if (!ele.empty()) ele.remove();
				log('🗑️ Node removed: ' + id);
				return;
			}
			const exists = cy.getElementById('n_' + id);
			if (!exists.empty()) exists.remove();
			cy.add({
				group: 'nodes',
				data: {
					id: 'n_' + id,
					nid: id,
					label: data.label || id,
					props: data.props || {},
					by: data.by || 'anon',
					updatedAt: data.updatedAt || 0,
				},
			});
			// Debounce layout updates
			clearTimeout(window.layoutTimeout);
			window.layoutTimeout = setTimeout(() => {
				try {
					cy.layout({ name: 'cose', animate: false }).run();
				} catch (e) {
					log('⚠️ Layout error: ' + e.message);
				}
			}, 100);
			log('📊 Node synced: ' + id + ' (' + (data.label || id) + ')');
		} catch (error) {
			log('❌ Error syncing node: ' + error.message);
		}
	});
	edgesChain.on((data, id) => {
		try {
			if (!data) {
				const ele = cy.getElementById('e_' + id);
				if (!ele.empty()) ele.remove();
				log('🗑️ Edge removed: ' + id);
				return;
			}
			const exists = cy.getElementById('e_' + id);
			if (!exists.empty()) exists.remove();
			cy.add({
				group: 'edges',
				data: {
					id: 'e_' + id,
					eid: id,
					source: 'n_' + data.from,
					target: 'n_' + data.to,
					label: data.label || '',
					props: data.props || {},
					by: data.by || 'anon',
					updatedAt: data.updatedAt || 0,
				},
			});
			// Debounce layout updates
			clearTimeout(window.layoutTimeout);
			window.layoutTimeout = setTimeout(() => {
				try {
					cy.layout({ name: 'cose', animate: false }).run();
				} catch (e) {
					log('⚠️ Layout error: ' + e.message);
				}
			}, 100);
			log(
				'📊 Edge synced: ' +
					id +
					' (' +
					data.from +
					' → ' +
					data.to +
					')'
			);
		} catch (error) {
			log('❌ Error syncing edge: ' + error.message);
		}
	});
}

// Initialize GunDB
initGun([]);

// Initialize Cytoscape
let cy;
document.addEventListener('DOMContentLoaded', function () {
	// Check if all required modules are loaded
	if (typeof Gun === 'undefined') {
		log('Error: Gun module not loaded');
		return;
	}
	if (typeof cytoscape === 'undefined') {
		log('Error: Cytoscape module not loaded');
		return;
	}
	// Initialize Cytoscape after DOM is loaded
	cy = cytoscape({
		container: $('cy'),
		style: [
			{
				selector: 'node',
				style: {
					'background-color': '#3fb950',
					label: 'data(label)',
					color: '#e6edf3',
					'text-outline-width': 1,
					'text-outline-color': '#0b0d10',
					'font-size': 12,
				},
			},
			{
				selector: 'edge',
				style: {
					'line-color': '#58a6ff',
					'target-arrow-color': '#58a6ff',
					'target-arrow-shape': 'triangle',
					'curve-style': 'bezier',
					width: 2,
					label: 'data(label)',
					'font-size': 10,
					color: '#9fb3c8',
				},
			},
		],
		layout: { name: 'cose', animate: false },
	});

	// Cytoscape event handlers
	cy.on('select', 'node,edge', (e) => {
		const d = e.target.data();
		$('sel').textContent = JSON.stringify(d, null, 2);
		if (d.id) {
			if (e.target.isNode && e.target.isNode()) {
				$('nodeId').value = d.nid || '';
				$('nodeLabel').value = d.label || '';
				$('nodeProps').value = JSON.stringify(d.props || {}, null, 2);
			}
			if (e.target.isEdge && e.target.isEdge()) {
				$('edgeId').value = d.eid || '';
				$('edgeFrom').value = d.source?.replace('n_', '') || '';
				$('edgeTo').value = d.target?.replace('n_', '') || '';
				$('edgeLabel').value = d.label || '';
				$('edgeProps').value = JSON.stringify(d.props || {}, null, 2);
			}
		}
	});

	// Add double-click to center on node
	cy.on('dblclick', 'node', function (e) {
		cy.center(e.target);
		cy.fit(e.target, 50);
	});

	// Add keyboard shortcuts
	document.addEventListener('keydown', function (e) {
		if (e.ctrlKey || e.metaKey) {
			switch (e.key) {
				case 's':
					e.preventDefault();
					$('exportBtn').click();
					break;
				case 'z':
					e.preventDefault();
					if (e.shiftKey) {
						// Ctrl+Shift+Z for redo (if needed)
					} else {
						// Ctrl+Z for undo (if needed)
					}
					break;
			}
		}
	});

	// Initialize search functionality
	$('searchNode').addEventListener('input', function () {
		const searchTerm = this.value.toLowerCase();
		if (searchTerm === '') {
			cy.elements().removeClass('search-highlight');
			return;
		}

		cy.elements().removeClass('search-highlight');
		cy.nodes().forEach((node) => {
			const label = node.data('label') || '';
			const props = JSON.stringify(node.data('props') || {});
			if (
				label.toLowerCase().includes(searchTerm) ||
				props.toLowerCase().includes(searchTerm)
			) {
				node.addClass('search-highlight');
			}
		});
	});

	$('clearSearch').addEventListener('click', function () {
		$('searchNode').value = '';
		cy.elements().removeClass('search-highlight');
	});

	// Layout controls
	$('layoutSelect').addEventListener('change', function () {
		const layout = this.value;
		cy.layout({ name: layout, animate: true }).run();
	});

	$('fitGraph').addEventListener('click', function () {
		cy.fit();
		cy.center();
	});

	// Set initial values
	$('peers').value = DEFAULT_PEERS.join(',');

	// Initialize the application
	log('GunDB Collaborative Graph loaded');
});

// Event handlers
$('createPair').onclick = () => {
	const alias = $('alias').value || `u_${uuid().slice(0, 6)}`;
	const pass = crypto.getRandomValues(new Uint8Array(16)).join('');
	user.create(alias, pass, (ack) => {
		if (ack.err) {
			log('create error ' + ack.err);
			return;
		}
		user.auth(alias, pass, ({ err }) => {
			if (err) {
				log('auth error ' + err);
				return;
			}
			localStorage.setItem(
				'gun_demo_creds',
				JSON.stringify({ alias, pass })
			);
			$('whoami').textContent = alias;
			log('logged in as ' + alias);
		});
	});
};

$('login').onclick = () => {
	const saved = tryJSON(localStorage.getItem('gun_demo_creds'));
	if (saved) {
		user.auth(saved.alias, saved.pass, ({ err }) => {
			if (err) log('auth error ' + err);
			else {
				$('whoami').textContent = saved.alias;
				log('logged in as ' + saved.alias);
			}
		});
		return;
	}
	const alias = $('alias').value.trim();
	if (!alias) {
		log('set alias or create identity');
		return;
	}
	const pass = prompt('Password for ' + alias + ':');
	user.auth(alias, pass, ({ err }) => {
		if (err) log('auth error ' + err);
		else {
			$('whoami').textContent = alias;
			log('logged in as ' + alias);
		}
	});
};

$('join').onclick = () => joinRoom($('room').value.trim() || 'public');

$('applyPeers').onclick = () => {
	const peers = $('peers')
		.value.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	if (peers.length === 0) {
		log('⚠️ Please enter at least one peer URL');
		return;
	}

	log('🔄 Connecting to peers: ' + peers.join(', '));
	initGun(peers);

	// Update room status if we're in a room
	if (currentRoom) {
		setTimeout(() => {
			const connectedPeers = Object.values(
				gun.back('opt.peers') || {}
			).filter(
				(peer) =>
					peer && peer.url && peer.wire && peer.wire.readyState === 1
			).length;
			if (connectedPeers > 0) {
				log('✅ Reconnected! Room data should sync now.');
				subscribeRoom(); // Re-subscribe to get latest data
			}
		}, 2000);
	}
};

$('testConnection').onclick = () => {
	const peers = gun.back('opt.peers') || {};
	const peerCount = Object.keys(peers).length;
	const connectedPeers = Object.values(peers).filter(
		(peer) => peer && peer.url && peer.wire && peer.wire.readyState === 1
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
};

$('addNode').onclick = () =>
	upsertNode({
		id: $('nodeId').value.trim(),
		label: $('nodeLabel').value.trim(),
		props: tryJSON($('nodeProps').value, {}),
	});
$('delNode').onclick = () => deleteNode($('nodeId').value.trim());
$('addEdge').onclick = () =>
	upsertEdge({
		id: $('edgeId').value.trim(),
		from: $('edgeFrom').value.trim(),
		to: $('edgeTo').value.trim(),
		label: $('edgeLabel').value.trim(),
		props: tryJSON($('edgeProps').value, {}),
	});
$('delEdge').onclick = () => deleteEdge($('edgeId').value.trim());

$('exportBtn').onclick = async () => {
	if (!graphRoot) {
		log('join a room first');
		return;
	}
	const data = await exportRoom(currentRoom);
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: 'application/json',
	});
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `${currentRoom}-graph.json`;
	a.click();
	log('exported');
};

$('importFile').onchange = async (ev) => {
	if (!graphRoot) {
		log('join a room first');
		return;
	}
	const file = ev.target.files[0];
	if (!file) return;
	const text = await file.text();
	const data = tryJSON(text, null);
	if (!data) {
		log('invalid JSON');
		return;
	}
	for (const n of data.nodes || [])
		graphRoot
			.get('nodes')
			.get(n.id || uuid())
			.put(n);
	for (const e of data.edges || [])
		graphRoot
			.get('edges')
			.get(e.id || uuid())
			.put(e);
	log('imported');
};

$('clearLocal').onclick = () => {
	localStorage.clear();
	if (indexedDB.databases) {
		indexedDB
			.databases()
			.then((dbs) =>
				dbs.forEach((db) => indexedDB.deleteDatabase(db.name))
			);
	}
	log('cleared local');
};

// Auto-join room from hash on page load
window.addEventListener('load', () => {
	const hash = decodeURIComponent(location.hash.slice(1));
	const target = hash || 'public';
	$('room').value = target;
	joinRoom(target);
});
