import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { processImageFromUrl } from '../lib/imageProcessor.js';
import { extractMetadata } from '../lib/metadataExtractor.js';

// Handle GET requests - retrieve bookmarks with filtering
async function handleGet(req, res) {
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

	let query = supabase.from('bookmarks').select('*');

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
		console.error('Supabase error:', error);
		return res.status(500).json({ error: 'Database error' });
	}

	// Add image_storage_url_present boolean but keep image_storage_url in response
	const bookmarksWithImageFlag = (bookmarks || []).map((b) => ({
		...b,
		image_storage_url_present: !!(
			b.image_storage_url && b.image_storage_url.length > 0
		),
	}));

	res.status(200).json(bookmarksWithImageFlag);
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
			const imageBuffer = await processImageFromUrl(metadata.image, {
				width: 360,
				height: 240,
				quality: 40,
				effort: 6,
				reductionEffort: 6,
				nearLossless: false,
				smartSubsample: false,
			});
			const filePath = `bookmark-thumbnails/${uuidv4()}.webp`;
			const { data: uploadData, error: uploadError } =
				await supabase.storage
					.from('thumbnails')
					.upload(filePath, imageBuffer, {
						contentType: 'image/webp',
						upsert: true,
					});

			if (uploadError) {
				console.error('Supabase Storage upload error:', uploadError);
			} else {
				const urlRes = supabase.storage
					.from('thumbnails')
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
		.from('bookmarks')
		.insert([newBookmark])
		.select()
		.single();

	if (error) {
		console.error('Supabase error:', error);
		return res.status(500).json({ error: 'Failed to create bookmark' });
	}

	res.status(201).json(data);
}

// Handle OPTIONS requests - CORS preflight
async function handleOptions(req, res) {
	res.status(200).end();
}

// Method handlers mapping
const methodHandlers = {
	GET: handleGet,
	POST: handlePost,
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
