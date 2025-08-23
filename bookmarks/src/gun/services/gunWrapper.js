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
	 * Clean node data by removing GunDB metadata and extracting clean props
	 */
	cleanNodeData(nodeData) {
		if (!nodeData || typeof nodeData !== 'object') {
			return null;
		}

		console.log('🔍 GunDBWrapper: Raw node data received:', nodeData);
		console.log('🔍 GunDBWrapper: Raw node props:', nodeData.props);

		// Extract clean props from the node data
		const cleanProps = this.extractCleanProps(nodeData.props);
		console.log('🔍 GunDBWrapper: Cleaned props:', cleanProps);

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
			console.log(
				'🔍 GunDBWrapper: Props data is not an object:',
				propsData
			);
			return {};
		}

		console.log('🔍 GunDBWrapper: Processing props data:', propsData);
		console.log(
			'🔍 GunDBWrapper: Props data keys:',
			Object.keys(propsData)
		);

		const cleanProps = {};

		// If propsData has a 'put' key, that's where the actual props are stored
		if (propsData.put && typeof propsData.put === 'object') {
			console.log(
				'🔍 GunDBWrapper: Found put key with data:',
				propsData.put
			);
			Object.keys(propsData.put).forEach((key) => {
				// Filter out GunDB metadata keys
				if (!this.isGunDBMetadata(key)) {
					cleanProps[key] = propsData.put[key];
					console.log(
						'🔍 GunDBWrapper: Added prop from put:',
						key,
						propsData.put[key]
					);
				} else {
					console.log(
						'🔍 GunDBWrapper: Filtered out metadata key:',
						key
					);
				}
			});
		}

		// Also check for props stored directly in the propsData object
		Object.keys(propsData).forEach((key) => {
			// Filter out GunDB metadata keys
			if (!this.isGunDBMetadata(key)) {
				cleanProps[key] = propsData[key];
				console.log(
					'🔍 GunDBWrapper: Added prop directly:',
					key,
					propsData[key]
				);
			} else {
				console.log('🔍 GunDBWrapper: Filtered out metadata key:', key);
			}
		});

		console.log('🔍 GunDBWrapper: Final clean props:', cleanProps);
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
}
