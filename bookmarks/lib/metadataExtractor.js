import ogs from 'open-graph-scraper';
import * as cheerio from 'cheerio';
import probe from 'probe-image-size';

// User agent string for web requests
const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

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

// Helper function to extract metadata using cheerio (fallback method)
async function extractMetadataWithCheerio(url) {
	try {
		const response = await fetch(url, {
			timeout: 10000,
			headers: {
				'User-Agent': USER_AGENT,
			},
		});

		if (!response.ok) {
			throw new Error('Failed to fetch URL');
		}

		const html = await response.text();
		const $ = cheerio.load(html);

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

		// Ensure meta image is absolute
		if (finalImage) {
			finalImage = resolveUrl(finalImage, url);
		}

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
		console.error('Error extracting metadata with cheerio:', error.message);
		return {
			title: '',
			description: '',
			image: '',
		};
	}
}

// Main function to extract metadata from URL using hybrid approach
export async function extractMetadata(url) {
	let scrapedMetadata = {
		title: '',
		description: '',
		image: '',
	};

	// First, try open-graph-scraper to get what we can
	try {
		const options = {
			url,
			timeout: 10000,
			fetchOptions: {
				headers: {
					'User-Agent': USER_AGENT,
				},
			},
		};

		const { result } = await ogs(options);

		if (!result.success) {
			throw new Error(`open-graph-scraper failed: ${result.error}`);
		}

		// Extract title with fallbacks
		const title =
			result.ogTitle || result.twitterTitle || result.dcTitle || '';

		// Extract description with fallbacks
		const description =
			result.ogDescription ||
			result.twitterDescription ||
			result.dcDescription ||
			'';

		// Extract image with fallbacks
		let image = '';
		if (result.ogImage && result.ogImage.length > 0) {
			image = result.ogImage[0].url || '';
		} else if (result.twitterImage && result.twitterImage.length > 0) {
			image = result.twitterImage[0].url || '';
		}

		scrapedMetadata = {
			title: title.trim(),
			description: description.trim(),
			image: image.trim(),
		};

		console.log('open-graph-scraper results:', scrapedMetadata);
	} catch (error) {
		console.error('Error with open-graph-scraper:', error.message);
	}

	// Check if we need to fill in any missing information with cheerio
	const needsTitle = !scrapedMetadata.title;
	const needsDescription = !scrapedMetadata.description;
	const needsImage = !scrapedMetadata.image;

	// Early return if we have everything we need
	if (!needsTitle && !needsDescription && !needsImage) {
		console.log(
			'open-graph-scraper provided complete metadata, skipping cheerio'
		);
		return scrapedMetadata;
	}

	// Use cheerio to fill in missing information
	console.log('Some metadata missing, using cheerio to fill gaps:', {
		needsTitle,
		needsDescription,
		needsImage,
	});

	try {
		const cheerioMetadata = await extractMetadataWithCheerio(url);

		// Merge results: use open-graph-scraper data if available, otherwise use cheerio data
		const finalMetadata = {
			title: scrapedMetadata.title || cheerioMetadata.title,
			description:
				scrapedMetadata.description || cheerioMetadata.description,
			image: scrapedMetadata.image || cheerioMetadata.image,
		};

		console.log('Final merged metadata:', finalMetadata);
		return finalMetadata;
	} catch (error) {
		console.error('Error with cheerio fallback:', error.message);
		// If cheerio fails, return whatever we got from open-graph-scraper
		return scrapedMetadata;
	}
}
