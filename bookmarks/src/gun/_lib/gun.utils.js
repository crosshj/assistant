/**
 * GunDB-specific utility functions
 * Functions for cleaning and processing GunDB data structures
 */

/**
 * Clean node data by removing GunDB metadata and extracting clean props
 */
export const cleanNodeData = (nodeData) => {
	if (!nodeData || typeof nodeData !== 'object') {
		return null;
	}

	// Extract clean props from the node data
	const cleanProps = extractCleanProps(nodeData.props);

	// Return clean node data
	return {
		id: nodeData.id,
		nid: nodeData.id, // Keep both for compatibility
		label: nodeData.label || '',
		props: cleanProps,
		by: nodeData.by || 'anon',
		updatedAt: nodeData.updatedAt || 0,
	};
};

/**
 * Clean edge data by removing GunDB metadata and extracting clean props
 */
export const cleanEdgeData = (edgeData) => {
	if (!edgeData || typeof edgeData !== 'object') {
		return null;
	}

	// Extract clean props from the edge data
	const cleanProps = extractCleanProps(edgeData.props);

	// Return clean edge data
	return {
		id: edgeData.id,
		eid: edgeData.id, // Keep both for compatibility
		from: edgeData.from || edgeData.source,
		to: edgeData.to || edgeData.target,
		label: edgeData.label || '',
		direction: edgeData.direction || 'both', // Default to 'both' instead of 'forward'
		props: cleanProps,
		by: edgeData.by || 'anon',
		updatedAt: edgeData.updatedAt || 0,
	};
};

/**
 * Extract clean props from GunDB's complex structure
 * This handles the @, #, >, $, VIA, seen metadata
 */
export const extractCleanProps = (propsData) => {
	if (!propsData || typeof propsData !== 'object') {
		return {};
	}

	const cleanProps = {};

	// If propsData has a 'put' key, that's where the actual props are stored
	if (propsData.put && typeof propsData.put === 'object') {
		Object.keys(propsData.put).forEach((key) => {
			// Filter out GunDB metadata keys
			if (!isGunDBMetadata(key)) {
				cleanProps[key] = propsData.put[key];
			}
		});
	}

	// Also check for props stored directly in the propsData object
	Object.keys(propsData).forEach((key) => {
		// Filter out GunDB metadata keys
		if (!isGunDBMetadata(key)) {
			cleanProps[key] = propsData[key];
		}
	});

	return cleanProps;
};

/**
 * Check if a key is GunDB internal metadata
 */
export const isGunDBMetadata = (key) => {
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
};

/**
 * Convert text to ID format (lowercase, hyphenated)
 */
export const textToId = (text) => {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
};
