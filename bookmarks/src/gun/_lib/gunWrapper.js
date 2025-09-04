import {
	cleanNodeData,
	cleanEdgeData,
	extractCleanProps,
	isGunDBMetadata,
} from './gun.utils.js';
import { runNetworkDiscovery } from './gun.discovery.js';
import Gun from 'gun';
import 'gun/sea';
import 'gun/axe';

export const DEFAULT_PEERS = [
	'https://gun-us.herokuapp.com/gun',
	'https://gun-eu.herokuapp.com/gun',
	'https://gunjs.herokuapp.com/gun',
];

const GUN_OPTIONS = {
	peers: DEFAULT_PEERS,
	localStorage: true,
	multicast: true,
	webrtc: true,
	retry: 3,
	timeout: 5000,
};

/**
 * GunDB Wrapper - THE Gun instance used throughout the app
 * Manages its own Gun instance internally and provides a clean API
 */
export class GunDBWrapper {
	constructor() {
		this.currentRoom = null;

		// Bind network discovery function
		this.runNetworkDiscovery = runNetworkDiscovery.bind(this);

		// Initialize Gun instance with default options
		this.reinitialize();
	}

	/**
	 * Destroy the current Gun instance
	 */
	destroy() {
		if (this._rawGun) {
			// Close all peer connections
			const peers = this._rawGun.back('opt.peers') || {};
			Object.values(peers).forEach((peer) => {
				if (peer && peer.wire) {
					peer.wire.close();
				}
			});
			this._rawGun = null;
		}
		this.currentRoom = null;
	}

	/**
	 * Reinitialize Gun instance
	 */
	reinitialize() {
		this.destroy();
		this._rawGun = Gun(GUN_OPTIONS);

		// Re-bind Gun API methods to new instance
		this.get = this._rawGun.get.bind(this._rawGun);
		this.put = this._rawGun.put.bind(this._rawGun);
		this.on = this._rawGun.on.bind(this._rawGun);
		this.off = this._rawGun.off.bind(this._rawGun);
		this.back = this._rawGun.back.bind(this._rawGun);
		this.user = this._rawGun.user.bind(this._rawGun);

		// Add simple utility methods
		this.getPeers = () => this._rawGun.back('opt.peers') || {};
		this.connect = () => this.reinitialize();
		this.disconnect = () => this.disconnectPeers();
		this.getGraphRoot = (room) => this._rawGun.get('graphs').get(room);
		this.getNodesChain = (room) => this.getGraphRoot(room).get('nodes');
		this.getEdgesChain = (room) => this.getGraphRoot(room).get('edges');
	}

	/**
	 * Get a clean node with props included
	 */
	async getNode(room, nodeId) {
		return new Promise((resolve) => {
			const nodeRef = this._rawGun
				.get('graphs')
				.get(room)
				.get('nodes')
				.get(nodeId);

			nodeRef.once((nodeData) => {
				if (!nodeData) {
					resolve(null);
					return;
				}

				// Clean the node data, removing GunDB metadata
				const cleanNode = cleanNodeData(nodeData);
				resolve(cleanNode);
			});
		});
	}

	/**
	 * Get a clean edge with props included
	 */
	async getEdge(room, edgeId) {
		return new Promise((resolve) => {
			const edgeRef = this._rawGun
				.get('graphs')
				.get(room)
				.get('edges')
				.get(edgeId);

			edgeRef.once((edgeData) => {
				if (!edgeData) {
					resolve(null);
					return;
				}

				// Clean the edge data, removing GunDB metadata
				const cleanEdge = cleanEdgeData(edgeData);
				resolve(cleanEdge);
			});
		});
	}

	// Get node props using targeted approach
	async getNodeProps(room, nodeId) {
		try {
			console.log(
				'🔍 GunDBWrapper: Starting getNodeProps for room:',
				room,
				'nodeId:',
				nodeId
			);
			const nodeRef = this._rawGun
				.get('graphs')
				.get(room)
				.get('nodes')
				.get(nodeId)
				.get('props');

			console.log(
				'🔍 GunDBWrapper: Created node ref, waiting for data...'
			);

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					console.log(
						'⚠️ GunDBWrapper: Node props timeout for:',
						nodeId
					);
					reject(new Error('Node props timeout'));
				}, 5000);

				// Use a one-time listener that immediately removes itself
				nodeRef.once((data) => {
					clearTimeout(timeout);
					console.log(
						'🔍 GunDBWrapper: RAW NODE DATA from GunDB:',
						data
					);
					console.log(
						'🔍 GunDBWrapper: Data type:',
						typeof data,
						'Data keys:',
						data ? Object.keys(data) : 'null'
					);
					if (data && data !== 'undefined') {
						const cleanProps = extractCleanProps(data);
						console.log(
							'✅ GunDBWrapper: Cleaned node props:',
							cleanProps
						);
						resolve(cleanProps);
					} else {
						console.log(
							'⚠️ GunDBWrapper: No node props data found'
						);
						resolve({});
					}
				});
			});
		} catch (error) {
			console.log(
				'❌ GunDBWrapper: Error in getNodeProps:',
				error.message
			);
			throw new Error(`Node props failed: ${error.message}`);
		}
	}

	/**
	 * Get ONLY the props for an edge without triggering sync events
	 * This method is isolated and won't interfere with graph sync
	 */
	async getEdgeProps(room, edgeId) {
		try {
			console.log(
				'🔍 GunDBWrapper: Starting getEdgeProps for room:',
				room,
				'edgeId:',
				edgeId
			);
			const edgeRef = this._rawGun
				.get('graphs')
				.get(room)
				.get('edges')
				.get(edgeId)
				.get('props');

			console.log(
				'🔍 GunDBWrapper: Created edge ref, waiting for data...'
			);

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Edge props timeout'));
				}, 2000);

				// Use a one-time listener that immediately removes itself
				edgeRef.once((data) => {
					clearTimeout(timeout);
					console.log(
						'🔍 GunDBWrapper: RAW EDGE DATA from GunDB:',
						data
					);
					console.log(
						'🔍 GunDBWrapper: Edge data type:',
						typeof data,
						'Edge data keys:',
						data ? Object.keys(data) : 'null'
					);
					if (data && data !== 'undefined') {
						const cleanProps = extractCleanProps(data);
						resolve(cleanProps);
					} else {
						resolve({});
					}
				});
			});
		} catch (error) {
			throw new Error(`Edge props failed: ${error.message}`);
		}
	}

	/**
	 * Create or update a node
	 */
	async upsertNode(room, nodeData) {
		return new Promise((resolve) => {
			const nodeRef = this._rawGun
				.get('graphs')
				.get(room)
				.get('nodes')
				.get(nodeData.id);

			// Clean the node data before storing
			const cleanNodeData = {
				id: nodeData.id,
				label: nodeData.label || '',
				props: nodeData.props || {},
				updatedAt: Date.now(),
				by: nodeData.by || 'anon',
			};

			nodeRef.put(cleanNodeData, (ack) => {
				if (ack.err) {
					resolve({ success: false, error: ack.err });
				} else {
					resolve({ success: true, data: cleanNodeData });
				}
			});
		});
	}

	/**
	 * Create or update an edge
	 */
	async upsertEdge(room, edgeData) {
		return new Promise((resolve) => {
			const edgeRef = this._rawGun
				.get('graphs')
				.get(room)
				.get('edges')
				.get(edgeData.id);

			// Clean the edge data before storing
			const cleanEdgeData = {
				id: edgeData.id,
				from: edgeData.from,
				to: edgeData.to,
				label: edgeData.label || '',
				direction: edgeData.direction || 'forward',
				props: edgeData.props || {},
				updatedAt: Date.now(),
				by: edgeData.by || 'anon',
			};

			edgeRef.put(cleanEdgeData, (ack) => {
				if (ack.err) {
					resolve({ success: false, error: ack.err });
				} else {
					resolve({ success: true, data: cleanEdgeData });
				}
			});
		});
	}

	// ===== PEER MANAGEMENT METHODS =====

	/**
	 * Get detailed peer information
	 */
	getDetailedPeerInfo() {
		const peers = this.getPeers();
		const detailedPeers = {};

		Object.entries(peers).forEach(([peerId, peer]) => {
			if (!peer) return;

			const isConnected = peer.wire && peer.wire.readyState === 1;

			detailedPeers[peerId] = {
				id: peer.id || peerId,
				url: peer.url || 'Unknown',
				wire: peer.wire,
				readyState: peer.wire ? peer.wire.readyState : null,
				isConnected,
				stability: {
					connected: isConnected,
					stableSince: null,
					stableTime: 0,
					stable: isConnected,
				},
				lastActivity: {
					connected: isConnected ? Date.now() : null,
					disconnected: !isConnected ? Date.now() : null,
				},
				metadata: {
					pid: peer.pid,
					opt: peer.opt,
				},
			};
		});

		return detailedPeers;
	}

	/**
	 * Get current peers as URL array
	 */
	getCurrentPeers() {
		const peers = this.getPeers();
		return Object.values(peers)
			.map((peer) => peer?.url)
			.filter(Boolean);
	}

	/**
	 * Get network information
	 */
	getNetworkInfo() {
		const peers = this.getPeers();
		const peerEntries = Object.entries(peers);
		const totalPeers = peerEntries.length;

		let connectedPeers = 0;
		let stablePeers = 0;

		peerEntries.forEach(([peerId, peer]) => {
			if (peer && peer.wire && peer.wire.readyState === 1) {
				connectedPeers++;
				stablePeers = connectedPeers; // Simplified for now
			}
		});

		const connectionRate =
			totalPeers > 0 ? (connectedPeers / totalPeers) * 100 : 0;

		let networkStatus = 'disconnected';
		if (connectedPeers === totalPeers && totalPeers > 0) {
			networkStatus = 'connected';
		} else if (connectedPeers > 0) {
			networkStatus = 'partial';
		}

		return {
			totalPeers,
			connectedPeers,
			stablePeers,
			connectionRate: Math.round(connectionRate),
			gunOptions: this._rawGun.back('opt') || {},
			networkStatus,
			isDisconnected: false,
			defaultPeers: DEFAULT_PEERS,
			currentPeers: this.getCurrentPeers(),
		};
	}

	// ===== CONNECTION MONITORING METHODS =====

	/**
	 * Disconnect all peers
	 */
	disconnectPeers() {
		const peers = this.getPeers();
		Object.values(peers).forEach((peer) => {
			if (peer && peer.wire) {
				peer.wire.close();
			}
		});
	}

	/**
	 * Test connection status
	 */
	testConnection() {
		const peers = this.getPeers();
		const peerCount = Object.keys(peers).length;
		const connectedPeers = Object.values(peers).filter(
			(peer) =>
				peer && peer.url && peer.wire && peer.wire.readyState === 1
		).length;

		return {
			connectedPeers,
			totalPeers: peerCount,
			connectionRate:
				peerCount > 0 ? (connectedPeers / peerCount) * 100 : 0,
		};
	}
}
