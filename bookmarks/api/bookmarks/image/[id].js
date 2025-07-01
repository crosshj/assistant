import { supabase } from '../../../lib/supabase.js';

export default async function handler(req, res) {
	// Enable CORS
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	if (req.method === 'OPTIONS') {
		res.status(200).end();
		return;
	}

	const { id } = req.query;

	if (!id) {
		res.status(400).json({ error: 'Bookmark id is required' });
		return;
	}

	try {
		const { data: bookmark, error } = await supabase
			.from('bookmarks')
			.select('image_storage_url')
			.eq('id', id)
			.single();

		if (error || !bookmark || !bookmark.image_storage_url) {
			res.status(404).json({ error: 'Image not found' });
			return;
		}

		const imageRes = await fetch(bookmark.image_storage_url);
		if (!imageRes.ok) {
			res.status(404).json({ error: 'Image not found in storage' });
			return;
		}
		const contentType =
			imageRes.headers.get('content-type') || 'image/webp';
		res.setHeader('Content-Type', contentType);
		res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
		const arrayBuffer = await imageRes.arrayBuffer();
		res.status(200).send(Buffer.from(arrayBuffer));
	} catch (err) {
		res.status(500).json({ error: 'Internal server error' });
	}
}
