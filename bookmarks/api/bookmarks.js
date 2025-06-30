import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from '../lib/supabase.js';
import probe from 'probe-image-size';

// Helper function to resolve relative URLs
function resolveUrl(src, baseUrl) {
	try {
		return new URL(src, baseUrl).href;
	} catch {
		return src;
	}
}

// Helper function to find the best image from <img> tags
async function findBestImage($, baseUrl) {
	const imgs = [];
	const SKIP_KEYWORDS = /avatar|logo|icon/i;
	const MIN_WIDTH = 400;
	const MIN_HEIGHT = 200;
	const MIN_ASPECT = 1.2;
	const MAX_ASPECT = 1.8;
	const candidates = [];
	const unknownSize = [];
	$('img').each((i, el) => {
		let src = $(el).attr('src');
		if (!src) return;
		const alt = $(el).attr('alt') || '';
		if (SKIP_KEYWORDS.test(src) || SKIP_KEYWORDS.test(alt)) return;
		src = resolveUrl(src, baseUrl);
		let width = parseInt($(el).attr('width'));
		let height = parseInt($(el).attr('height'));
		// Try to extract from style if missing
		if (!width || !height) {
			const style = $(el).attr('style') || '';
			const matchW = style.match(/width:\s*(\d+)px/);
			const matchH = style.match(/height:\s*(\d+)px/);
			if (matchW) width = parseInt(matchW[1]);
			if (matchH) height = parseInt(matchH[1]);
		}
		width = isNaN(width) ? undefined : width;
		height = isNaN(height) ? undefined : height;
		if (width && height) {
			candidates.push({ src, width, height });
		} else {
			unknownSize.push({ src });
		}
	});
	// For images without size info, probe their actual size
	for (const img of unknownSize) {
		try {
			const result = await probe(img.src);
			if (result && result.width && result.height) {
				candidates.push({
					src: img.src,
					width: result.width,
					height: result.height,
				});
			}
		} catch (e) {
			// Ignore errors (e.g., image not found or not accessible)
		}
	}
	// Only consider images that meet minimum size and aspect ratio
	const validImgs = candidates.filter((img) => {
		if (!img.width || !img.height) return false;
		if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) return false;
		const aspect = img.width / img.height;
		if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) return false;
		return true;
	});
	const ASPECT_TARGET = 1.5;
	const ASPECT_TOLERANCE = 0.2;
	let bestImg = null;
	let bestScore = Infinity;
	let bestArea = 0;
	validImgs.forEach((img) => {
		const aspect = img.width / img.height;
		const aspectDiff = Math.abs(aspect - ASPECT_TARGET);
		if (aspectDiff <= ASPECT_TOLERANCE) {
			const area = img.width * img.height;
			const score = aspectDiff * 1000 - area;
			if (score < bestScore) {
				bestScore = score;
				bestArea = area;
				bestImg = img;
			}
		}
	});
	// If none match aspect, pick largest by area
	if (!bestImg && validImgs.length > 0) {
		validImgs.forEach((img) => {
			const area = img.width * img.height;
			if (area > bestArea) {
				bestArea = area;
				bestImg = img;
			}
		});
	}
	// If still none, return empty string
	return bestImg ? bestImg.src : '';
}

// Helper function to extract metadata from URL
async function extractMetadata(url) {
	try {
		const response = await axios.get(url, {
			timeout: 10000,
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			},
		});

		const $ = cheerio.load(response.data);

		const title =
			$('title').text() ||
			$('meta[property="og:title"]').attr('content') ||
			'';
		const description =
			$('meta[name="description"]').attr('content') ||
			$('meta[property="og:description"]').attr('content') ||
			'';
		const image =
			$('meta[property="og:image"]').attr('content') ||
			$('meta[name="twitter:image"]').attr('content') ||
			'';
		let finalImage = image ? image.trim() : '';

		// If no meta image, find the best <img> on the page
		if (!finalImage) {
			finalImage = await findBestImage($, url);
		}

		return {
			title: title.trim(),
			description: description.trim(),
			image: finalImage,
		};
	} catch (error) {
		console.error('Error extracting metadata:', error.message);
		return {
			title: '',
			description: '',
			image: '',
		};
	}
}

export default async function handler(req, res) {
	// Enable CORS
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, DELETE, OPTIONS'
	);
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	if (req.method === 'OPTIONS') {
		res.status(200).end();
		return;
	}

	try {
		if (req.method === 'GET') {
			// Get all bookmarks with optional filtering
			const {
				search,
				tag,
				read,
				favorite,
				sort = 'created_at',
				order = 'DESC',
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

			const { data: bookmarks, error } = await query;

			if (error) {
				console.error('Supabase error:', error);
				return res.status(500).json({ error: 'Database error' });
			}

			res.status(200).json(bookmarks || []);
		} else if (req.method === 'POST') {
			// Create new bookmark
			const { url, tags = '' } = req.body;

			if (!url) {
				return res.status(400).json({ error: 'URL is required' });
			}

			const metadata = await extractMetadata(url);
			const id = uuidv4();
			const now = new Date().toISOString();

			const newBookmark = {
				id,
				url,
				title: metadata.title,
				description: metadata.description,
				image: metadata.image,
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
				return res
					.status(500)
					.json({ error: 'Failed to create bookmark' });
			}

			res.status(201).json(data);
		} else {
			res.status(405).json({ error: 'Method not allowed' });
		}
	} catch (error) {
		console.error('API Error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
}
