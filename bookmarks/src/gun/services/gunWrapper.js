/**
 * GunDB Wrapper - Provides a clean API that hides GunDB's complexity
 * Automatically cleans data and includes props when reading nodes/edges
 */
export class GunDBWrapper {
	constructor(connection) {
		this.connection = connection;
	}

	/**
	 * Get a clean node with props included
	 */
	async getNode(room, nodeId) {
		return new Promise((resolve) => {
			const gun = this.connection.gun;
			const nodeRef = gun
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
				const cleanNode = this.cleanNodeData(nodeData);
				resolve(cleanNode);
			});
		});
	}

	/**
	 * Get a clean edge with props included
	 */
	async getEdge(room, edgeId) {
		return new Promise((resolve) => {
			const gun = this.connection.gun;
			const edgeRef = gun
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
				const cleanEdge = this.cleanEdgeData(edgeData);
				resolve(cleanEdge);
			});
		});
	}

	/**
	 * Test if isolated instance approach is working
	 * This helps debug sync interference issues
	 */
	async testIsolatedInstance() {
		try {
			const isolatedGun = this.connection.createIsolatedInstance();
			const testRef = isolatedGun
				.get('graphs')
				.get('public')
				.get('nodes')
				.get('test');

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Isolated test timeout'));
				}, 2000);

				testRef.once((data) => {
					clearTimeout(timeout);
					resolve(data);
				});
			});
		} catch (error) {
			throw new Error(`Isolated test failed: ${error.message}`);
		}
	}

	/**
	 * Debug method: Check what data is actually stored in a node
	 * This helps diagnose why props aren't being retrieved
	 */
	async debugNodeData(room, nodeId) {
		try {
			const gunRef = this.connection.gun
				.get('graphs')
				.get(room)
				.get('nodes')
				.get(nodeId);

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Debug timeout'));
				}, 2000);

				gunRef.once((data) => {
					clearTimeout(timeout);
					if (data && data !== 'undefined') {
						resolve(data);
					} else {
						reject(new Error('No data found'));
					}
				});
			});
		} catch (error) {
			throw new Error(`Debug failed: ${error.message}`);
		}
	}

	/**
	 * Test if the isolated approach is working properly
	 */
	async testIsolatedPropsFetch(room, elementType, elementId) {
		try {
			const props = await this.getPropsIsolated(
				room,
				elementType,
				elementId
			);
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Try to get props from existing graph data in memory
	 * This is the most non-interfering approach since it doesn't make GunDB calls
	 */
	async getPropsFromMemory(room, elementType, elementId) {
		try {
			// This would need access to the graph data that's already loaded
			// For now, return empty props - this method can be enhanced later
			return {};
		} catch (error) {
			return {};
		}
	}

	/**
	 * Get props directly from the visualization component's existing data
	 * This is the most non-interfering approach - no GunDB calls at all
	 */
	async getPropsFromVisualization(elementId, isNode = true) {
		try {
			if (!window.cy) {
				return {};
			}

			const element = window.cy.getElementById(elementId);
			if (!element || element.length === 0) {
				return {};
			}

			const data = element.data();
			return data.props || {};
		} catch (error) {
			return {};
		}
	}

	/**
	 * Get props using the main connection but with careful, non-interfering approach
	 * This method reads props without triggering sync events
	 */
	async getPropsCarefully(room, elementId, isNode = true) {
		try {
			const baseRef = this.connection.gun
				.get('graphs')
				.get(room)
				.get(isNode ? 'nodes' : 'edges')
				.get(elementId);

			const propsRef = baseRef.get('props');

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Careful props timeout'));
				}, 2000);

				// Use a very short-lived listener that removes itself immediately
				const listener = (data) => {
					clearTimeout(timeout);
					propsRef.off('value', listener);
					if (data && data !== 'undefined') {
						const cleanProps = this.cleanPropsData(data);
						resolve(cleanProps);
					} else {
						resolve({});
					}
				};

				propsRef.on('value', listener);
			});
		} catch (error) {
			throw new Error(`Careful props failed: ${error.message}`);
		}
	}

	/**
	 * Get props using a completely isolated GunDB instance with minimal interference
	 * This method creates a new GunDB instance with only essential peers
	 */
	async getPropsIsolated(room, elementType, elementId) {
		try {
			// Create a completely new GunDB instance with minimal configuration
			const isolatedGun = Gun({
				peers: ['https://gun-us.herokuapp.com/gun'], // Single peer only
				localStorage: false, // No local storage
				retry: 0, // No retries
				timeout: 2000, // Very short timeout
			});

			// Create a reference to ONLY the props field
			const propsRef = isolatedGun
				.get('graphs')
				.get(room)
				.get(elementType === 'node' ? 'nodes' : 'edges')
				.get(elementId)
				.get('props');

			// Use a one-time listener with immediate cleanup
			const listener = (propsData) => {
				// Clean up immediately
				this.cleanupIsolatedInstance(isolatedGun);

				if (!propsData) {
					return;
				}

				// Extract clean props
				const cleanProps = this.extractCleanProps(propsData);
				return cleanProps;
			};

			// Listen once
			propsRef.once(listener);
		} catch (error) {
			throw new Error(`Isolated props failed: ${error.message}`);
		}
	}

	/**
	 * Clean up isolated GunDB instance to prevent lingering connections
	 */
	cleanupIsolatedInstance(isolatedGun) {
		try {
			// Try to disconnect the isolated instance
			if (isolatedGun && typeof isolatedGun.off === 'function') {
				isolatedGun.off(); // Remove all listeners
			}
		} catch (error) {
			// Silently handle cleanup errors
		}
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
			const nodeRef = this.connection.gun
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
				}, 2000);

				// Use a one-time listener that immediately removes itself
				nodeRef.once((data) => {
					clearTimeout(timeout);
					console.log(
						'🔍 GunDBWrapper: Received node props data:',
						data
					);
					if (data && data !== 'undefined') {
						const cleanProps = this.cleanPropsData(data);
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
			const edgeRef = this.connection.gun
				.get('graphs')
				.get(room)
				.get('edges')
				.get(edgeId)
				.get('props');

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Edge props timeout'));
				}, 2000);

				// Use a one-time listener that immediately removes itself
				edgeRef.once((data) => {
					clearTimeout(timeout);
					if (data && data !== 'undefined') {
						const cleanProps = this.cleanPropsData(data);
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
	 * Fallback method: Get props using a minimal, non-interfering approach
	 * This is a simpler alternative if the isolated instance approach has issues
	 */
	async getPropsFallback(room, elementId, isNode = true) {
		try {
			const baseRef = this.connection.gun
				.get('graphs')
				.get(room)
				.get(isNode ? 'nodes' : 'edges')
				.get(elementId);

			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Fallback props timeout'));
				}, 2000);

				baseRef.once((data) => {
					clearTimeout(timeout);
					if (data && data !== 'undefined') {
						const cleanProps = this.cleanPropsData(data);
						resolve(cleanProps);
					} else {
						resolve({});
					}
				});
			});
		} catch (error) {
			throw new Error(`Fallback props failed: ${error.message}`);
		}
	}

	/**
	 * Clean node data by removing GunDB metadata and extracting clean props
	 */
	cleanNodeData(nodeData) {
		if (!nodeData || typeof nodeData !== 'object') {
			return null;
		}

		// Extract clean props from the node data
		const cleanProps = this.extractCleanProps(nodeData.props);

		// Return clean node data
		return {
			id: nodeData.id,
			nid: nodeData.id, // Keep both for compatibility
			label: nodeData.label || '',
			props: cleanProps,
			by: nodeData.by || 'anon',
			updatedAt: nodeData.updatedAt || 0,
		};
	}

	/**
	 * Clean edge data by removing GunDB metadata and extracting clean props
	 */
	cleanEdgeData(edgeData) {
		if (!edgeData || typeof edgeData !== 'object') {
			return null;
		}

		// Extract clean props from the edge data
		const cleanProps = this.extractCleanProps(edgeData.props);

		// Return clean edge data
		return {
			id: edgeData.id,
			eid: edgeData.id, // Keep both for compatibility
			from: edgeData.from || edgeData.source,
			to: edgeData.to || edgeData.target,
			label: edgeData.label || '',
			props: cleanProps,
			by: edgeData.by || 'anon',
			updatedAt: edgeData.updatedAt || 0,
		};
	}

	/**
	 * Extract clean props from GunDB's complex structure
	 * This handles the @, #, >, $, VIA, seen metadata
	 */
	extractCleanProps(propsData) {
		if (!propsData || typeof propsData !== 'object') {
			return {};
		}

		const cleanProps = {};

		// If propsData has a 'put' key, that's where the actual props are stored
		if (propsData.put && typeof propsData.put === 'object') {
			Object.keys(propsData.put).forEach((key) => {
				// Filter out GunDB metadata keys
				if (!this.isGunDBMetadata(key)) {
					cleanProps[key] = propsData.put[key];
				}
			});
		}

		// Also check for props stored directly in the propsData object
		Object.keys(propsData).forEach((key) => {
			// Filter out GunDB metadata keys
			if (!this.isGunDBMetadata(key)) {
				cleanProps[key] = propsData[key];
			}
		});

		return cleanProps;
	}

	/**
	 * Check if a key is GunDB internal metadata
	 */
	isGunDBMetadata(key) {
		const metadataKeys = [
			'$',
			'VIA',
			'seen',
			'get',
			'put',
			'@',
			'#',
			'>',
			'ok',
			'_',
			'$$',
		];
		return metadataKeys.includes(key);
	}

	/**
	 * Create or update a node
	 */
	async upsertNode(room, nodeData) {
		return new Promise((resolve) => {
			const gun = this.connection.gun;
			const nodeRef = gun
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
			const gun = this.connection.gun;
			const edgeRef = gun
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

	// Clean props data by filtering out metadata keys
	cleanPropsData(propsData) {
		if (!propsData || typeof propsData !== 'object') {
			return {};
		}

		const cleanProps = {};
		const metadataKeys = ['_', '#', '>', 'gun', 'put', 'get', 'on', 'off'];

		for (const [key, value] of Object.entries(propsData)) {
			// Skip metadata keys
			if (metadataKeys.includes(key)) {
				continue;
			}

			// Add valid props
			cleanProps[key] = value;
		}

		return cleanProps;
	}
}
