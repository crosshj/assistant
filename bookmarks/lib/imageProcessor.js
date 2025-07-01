import sharp from 'sharp';
import getColors from 'get-image-colors';

/**
 * Downloads an image from a URL, resizes and compresses it to WEBP, and returns a Buffer.
 * @param {string} url - The image URL to download.
 * @param {object} options - Options for resizing and compression.
 * @param {number} [options.width=240] - Width of the output image.
 * @param {number} [options.height=160] - Height of the output image.
 * @param {number} [options.quality=50] - WEBP quality (1-100).
 * @param {number} [options.effort] - WEBP encoding effort (0-6).
 * @param {boolean} [options.nearLossless] - Use WEBP near-lossless mode.
 * @param {boolean} [options.smartSubsample] - Use smart subsampling for WEBP.
 * @param {boolean} [options.grayscale] - Output image in grayscale (b-w).
 * @param {boolean} [options.monotone] - Output image as monotone (tinted grayscale with dominant color).
 * @param {string|number[]} [options.monotoneColor] - Fixed color for monotone overlay (hex string or RGB array).
 * @returns {Promise<Buffer>} - The processed image as a Buffer.
 */
function hexToRgb(hex) {
	const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
	return m
		? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
		: [128, 128, 128];
}

export async function processImageFromUrl(url, options = {}) {
	const width = options.width || 240;
	const height = options.height || 160;
	const quality = options.quality || 50;
	const {
		effort,
		nearLossless,
		smartSubsample,
		grayscale,
		monotone,
		monotoneColor,
	} = options;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch image: ${response.status} ${response.statusText}`
		);
	}
	const arrayBuffer = await response.arrayBuffer();
	const inputBuffer = Buffer.from(arrayBuffer);

	let processed = sharp(inputBuffer);

	if (monotone) {
		let color = null;
		if (monotoneColor) {
			if (Array.isArray(monotoneColor)) {
				color = monotoneColor;
			} else if (typeof monotoneColor === 'string') {
				color = hexToRgb(monotoneColor);
			}
		}
		if (!color) {
			let colorBuffer = inputBuffer;
			// Convert WEBP to PNG for color extraction
			try {
				const metadata = await sharp(inputBuffer).metadata();
				if (metadata.format === 'webp') {
					colorBuffer = await sharp(inputBuffer).png().toBuffer();
				}
			} catch (e) {
				// fallback to original buffer
			}
			color = [128, 128, 128];
			try {
				const colors = await getColors(colorBuffer, 'image/png');
				if (colors && colors[0]) {
					color = colors[0].rgb();
				}
			} catch (e) {
				// fallback to gray
			}
		}
		// Get current image dimensions for overlay
		const meta = await processed.metadata();
		const overlay = await sharp({
			create: {
				width: meta.width,
				height: meta.height,
				channels: 3,
				background: { r: color[0], g: color[1], b: color[2] },
			},
		})
			.png()
			.toBuffer();
		// Apply grayscale and overlay, then re-instantiate sharp for resizing
		const monotoneBuffer = await processed
			.grayscale()
			.composite([{ input: overlay, blend: 'multiply' }])
			.toBuffer();
		processed = sharp(monotoneBuffer);
	} else if (grayscale) {
		processed = processed.grayscale();
	}

	// When processing an image, check its dimensions first. If both width and height are less than or equal to the target, skip resizing but still convert to WEBP and apply quality/compression.
	// Example logic:
	// 1. Probe the image to get its dimensions.
	// 2. If width <= targetWidth and height <= targetHeight, skip .resize().
	// 3. Always apply .webp() and other options.

	// Probe the image dimensions after color effects
	const meta = await processed.metadata();
	if (meta.width > width || meta.height > height) {
		processed = processed.resize(width, height, { fit: 'cover' });
	}
	// Always apply removeAlpha and webp conversion
	processed = processed.removeAlpha().webp({
		quality,
		...(effort !== undefined ? { effort } : {}),
		...(nearLossless !== undefined ? { nearLossless } : {}),
		...(smartSubsample !== undefined ? { smartSubsample } : {}),
	});

	const outputBuffer = await processed.toBuffer();

	// DEBUG: Save processed image to disk
	import('fs').then((fs) => {
		fs.writeFileSync('debug-output.webp', outputBuffer);
	});

	return outputBuffer;
}
