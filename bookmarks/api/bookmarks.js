import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { processImageFromUrl } from '../lib/imageProcessor.js';
import { extractMetadata } from '../lib/metadataExtractor.js';

// Handle image requests - serve bookmark image as proxy
async function handleGetImage(req, res) {
	console.log('[GET] Image request for ID:', req.query.id);

	try {
		const { data: bookmark, error } = await supabase
			.from('bookmarks_rows')
			.select('image_storage_url')
			.eq('id', req.query.id)
			.single();

		if (error || !bookmark || !bookmark.image_storage_url) {
			console.log('[GET] Image not found for bookmark:', req.query.id);
			return res.status(404).json({ error: 'Image not found' });
		}

		console.log(
			'[GET] Fetching image from storage:',
			bookmark.image_storage_url
		);
		const imageRes = await fetch(bookmark.image_storage_url);
		if (!imageRes.ok) {
			console.log('[GET] Image not found in storage');
			return res
				.status(404)
				.json({ error: 'Image not found in storage' });
		}

		const contentType =
			imageRes.headers.get('content-type') || 'image/webp';
		res.setHeader('Content-Type', contentType);
		res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

		const arrayBuffer = await imageRes.arrayBuffer();
		console.log(
			'[GET] Successfully served image for bookmark:',
			req.query.id
		);
		return res.status(200).send(Buffer.from(arrayBuffer));
	} catch (error) {
		console.error('[GET] Error serving image:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
}

// Handle individual bookmark requests - get single bookmark by ID
async function handleGetDetail(req, res) {
	console.log('[GET] Individual bookmark request for ID:', req.query.id);

	const { data: bookmark, error } = await supabase
		.from('bookmarks_rows')
		.select('*')
		.eq('id', req.query.id)
		.single();

	if (error) {
		console.log('[GET] Supabase error:', error);
		if (error.code === 'PGRST116') {
			console.log('[GET] Bookmark not found, returning 404');
			return res.status(404).json({ error: 'Bookmark not found' });
		}
		console.error('[GET] Database error:', error);
		return res.status(500).json({ error: 'Database error' });
	}

	console.log('[GET] Successfully retrieved bookmark:', bookmark?.id);
	return res.status(200).json(bookmark);
}

// Handle bookmarks list requests - get paginated bookmarks with filtering
async function handleGetList(req, res) {
	const {
		search,
		tag,
		read,
		favorite,
		sort = 'created_at',
		order = 'DESC',
		limit = 30,
		offset = 0,
	} = req.query;

	console.log('[GET] Fetching bookmarks with filters:', {
		search,
		tag,
		read,
		favorite,
		sort,
		order,
		limit,
		offset,
	});

	let query = supabase.from('bookmarks_rows').select('*');

	// Apply filters
	if (search) {
		query = query.or(
			`title.ilike.%${search}%,description.ilike.%${search}%,url.ilike.%${search}%`
		);
	}

	if (tag) {
		query = query.ilike('tags', `%${tag}%`);
	}

	if (read !== undefined) {
		query = query.eq('read_status', parseInt(read));
	}

	if (favorite !== undefined) {
		query = query.eq('favorite', parseInt(favorite));
	}

	// Apply sorting
	query = query.order(sort, { ascending: order === 'ASC' });

	// Pagination
	const from = parseInt(offset);
	const to = from + parseInt(limit) - 1;
	query = query.range(from, to);

	const { data: bookmarks, error } = await query;

	if (error) {
		console.error('[GET] Supabase error:', error);
		return res.status(500).json({ error: 'Database error' });
	}

	// Add image_storage_url_present boolean but keep image_storage_url in response
	const bookmarksWithImageFlag = (bookmarks || []).map((b) => ({
		...b,
		image_storage_url_present: !!(
			b.image_storage_url && b.image_storage_url.length > 0
		),
	}));

	console.log(
		'[GET] Successfully fetched',
		bookmarksWithImageFlag?.length || 0,
		'bookmarks'
	);
	res.status(200).json(bookmarksWithImageFlag);
}

// Handle GET requests - route to appropriate handler based on query parameters
async function handleGet(req, res) {
	console.log('[GET] Starting handleGet');
	console.log('[GET] Query params:', req.query);

	// Handle image requests
	if (req.query.image === 'true' && req.query.id) {
		return handleGetImage(req, res);
	}

	// Handle individual bookmark requests
	if (req.query.id && req.query.image !== 'true') {
		return handleGetDetail(req, res);
	}

	// Handle paginated bookmarks list with filtering (default case)
	return handleGetList(req, res);
}

// Handle POST requests - create new bookmark
async function handlePost(req, res) {
	const { url, tags = '' } = req.body;

	if (!url) {
		return res.status(400).json({ error: 'URL is required' });
	}

	const metadata = await extractMetadata(url);
	let imageUrl = null;

	if (metadata.image) {
		try {
			const imageResult = await processImageFromUrl(metadata.image, {
				width: 360,
				height: 240,
				quality: 40,
				effort: 6,
				reductionEffort: 6,
				nearLossless: false,
				smartSubsample: false,
			});

			// Handle different image formats
			const fileExtension = imageResult.format === 'svg' ? 'svg' : 'webp';
			const filePath = `thumbs/${uuidv4()}.${fileExtension}`;

			const { data: uploadData, error: uploadError } =
				await supabase.storage
					.from('bookmarks_storage')
					.upload(filePath, imageResult.buffer, {
						contentType: imageResult.contentType,
						upsert: true,
					});

			if (uploadError) {
				console.error('Supabase Storage upload error:', uploadError);
			} else {
				const urlRes = supabase.storage
					.from('bookmarks_storage')
					.getPublicUrl(filePath);
				const { publicUrl } = urlRes?.data || {};
				console.log({ urlRes });
				console.log('Public URL:', publicUrl);
				imageUrl = publicUrl;
			}
		} catch (e) {
			console.error('Image processing or upload failed:', e);
			imageUrl = null;
			metadata.image = undefined;
		}
	}

	const id = uuidv4();
	const now = new Date().toISOString();

	const newBookmark = {
		id,
		url,
		title: metadata.title,
		description: metadata.description,
		image: metadata.image,
		image_storage_url: imageUrl,
		tags,
		created_at: now,
		updated_at: now,
		read_status: 0,
		favorite: 0,
	};

	const { data, error } = await supabase
		.from('bookmarks_rows')
		.insert([newBookmark])
		.select()
		.single();

	if (error) {
		console.error('Supabase error:', error);
		return res.status(500).json({ error: 'Failed to create bookmark' });
	}

	res.status(201).json(data);
}

// Handle PUT requests - update bookmark by ID
async function handlePut(req, res) {
	console.log('[PUT] Starting handlePut');
	console.log('[PUT] Request body:', req.body);

	// Try to get ID from body first, then fall back to query parameter
	const id = req.body?.id || req.query.id;
	const { title, description, tags, read_status, favorite } = req.body;

	console.log('[PUT] Bookmark ID to update:', id);

	if (!id) {
		console.log('[PUT] Missing ID parameter');
		return res
			.status(400)
			.json({ error: 'ID parameter is required in body or query' });
	}

	const updates = {
		updated_at: new Date().toISOString(),
	};

	if (title !== undefined) updates.title = title;
	if (description !== undefined) updates.description = description;
	if (tags !== undefined) updates.tags = tags;
	if (read_status !== undefined) updates.read_status = read_status;
	if (favorite !== undefined) updates.favorite = favorite;

	console.log('[PUT] Updates to apply:', updates);
	console.log('[PUT] Updating bookmark in Supabase:', id);

	const { data: bookmark, error } = await supabase
		.from('bookmarks_rows')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	if (error) {
		console.log('[PUT] Supabase error:', error);
		if (error.code === 'PGRST116') {
			console.log('[PUT] Bookmark not found, returning 404');
			return res.status(404).json({ error: 'Bookmark not found' });
		}
		console.error('[PUT] Update failed:', error);
		return res.status(500).json({ error: 'Failed to update bookmark' });
	}

	console.log('[PUT] Successfully updated bookmark:', bookmark?.id);
	res.status(200).json(bookmark);
}

// Handle DELETE requests - delete bookmark by ID
async function handleDelete(req, res) {
	console.log('[DELETE] Starting handleDelete');
	console.log('[DELETE] Request body:', req.body);

	// Try to get ID from body first, then fall back to query parameter
	const id = req.body?.id || req.query.id;

	console.log('[DELETE] Bookmark ID to delete:', id);

	if (!id) {
		console.log('[DELETE] Missing ID parameter');
		return res
			.status(400)
			.json({ error: 'ID parameter is required in body or query' });
	}

	console.log('[DELETE] Deleting bookmark from Supabase:', id);
	const { error } = await supabase.from('bookmarks_rows').delete().eq('id', id);

	if (error) {
		console.error('[DELETE] Supabase delete error:', error);
		return res.status(500).json({ error: 'Failed to delete bookmark' });
	}

	console.log('[DELETE] Successfully deleted bookmark:', id);
	res.status(204).end(); // 204 No Content is appropriate for successful DELETE
}

// Handle OPTIONS requests - CORS preflight
async function handleOptions(req, res) {
	res.status(200).end();
}

// Method handlers mapping
const methodHandlers = {
	GET: handleGet,
	POST: handlePost,
	PUT: handlePut,
	DELETE: handleDelete,
	OPTIONS: handleOptions,
};
const methods = Object.keys(methodHandlers).join(', ');

// Main handler function
export default async function handler(req, res) {
	// Enable CORS
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', methods);
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	try {
		const methodHandler = methodHandlers[req.method];
		if (!methodHandler) {
			return res.status(405).json({ error: 'Method not allowed' });
		}
		await methodHandler(req, res);
	} catch (error) {
		console.error('API Error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
}
