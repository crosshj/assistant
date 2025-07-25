import 'dotenv/config';
import { processImageFromUrl } from './imageProcessor.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Ensure test output directory exists
const TEST_OUTPUT_DIR = path.join(process.cwd(), 'test-results');
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
	fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

const localTest = process.env.IS_LOCAL ? test : test.skip;

describe('processImageFromUrl', () => {
	const testImageUrl =
		'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/320px-PNG_transparency_demonstration_1.png';

	it('should download, resize, and compress an image to WEBP', async () => {
		const result = await processImageFromUrl(testImageUrl, {
			width: 240,
			height: 160,
			quality: 50,
		});
		expect(result).toHaveProperty('buffer');
		expect(result).toHaveProperty('format');
		expect(result).toHaveProperty('contentType');
		expect(Buffer.isBuffer(result.buffer)).toBe(true);
		expect(result.format).toBe('webp');
		expect(result.contentType).toBe('image/webp');
		// Check that the buffer is a WEBP image
		const metadata = await sharp(result.buffer).metadata();
		expect(metadata.format).toBe('webp');
		expect(metadata.width).toBe(240);
		expect(metadata.height).toBe(160);
		// Should be reasonably small
		expect(result.buffer.length).toBeLessThan(20000);
	});

	it('should handle SVG images correctly', async () => {
		// Mock SVG URL (since we can't guarantee a real SVG URL will always be available)
		const mockSvgUrl = 'https://example.com/test.svg';
		const mockSvgContent =
			'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';

		// Mock fetch for this test
		const originalFetch = global.fetch;
		global.fetch = function (url) {
			return Promise.resolve({
				ok: true,
				arrayBuffer: () =>
					Promise.resolve(Buffer.from(mockSvgContent).buffer),
			});
		};

		const result = await processImageFromUrl(mockSvgUrl);

		expect(result).toHaveProperty('buffer');
		expect(result).toHaveProperty('format', 'svg');
		expect(result).toHaveProperty('contentType', 'image/svg+xml');
		expect(Buffer.isBuffer(result.buffer)).toBe(true);
		expect(result.buffer.toString('utf8')).toContain('<svg');

		// Restore original fetch
		global.fetch = originalFetch;
	});

	it('should throw for an invalid URL', async () => {
		await expect(
			processImageFromUrl('https://invalid.example.com/image.png')
		).rejects.toThrow();
	}, 20000);

	it('should throw for a non-image URL', async () => {
		await expect(
			processImageFromUrl('https://example.com')
		).rejects.toThrow();
	});
});

describe('output images at different qualities (local only)', () => {
	const testImageUrls = [
		'https://forwardemail.net/img/articles/email-startup-graveyard-fa0072188b.webp',
		'https://www.danmcquillan.org/images/Illich+Giulio-speech-bubbles+text-r.png',
		'https://assets.buttondown.email/images/adbad69f-6c88-4710-8463-4ab0eca54277.png?w=960&fit=max',
		'https://www.adatosystems.com/wp-content/uploads/2025/02/pexels-pandu-cahya-355263165-14259937-scaled.jpg',
		// 'https://combo.staticflickr.com/66a031f9fc343c5e42d965ca/671aaf5d51c929e483e8b26d_Open%20Graph%20Home.jpg',
		// 'https://blog.snork.dev/media/default-card.jpg',
		// 'https://neilzone.co.uk/content/images/2024-10-17_neil.jpg',
		// 'https://a.slack-edge.com/737c9d1/marketing/img/homepage/revamped-24/unfurl/hp-revamp-unfurl.en-GB.jpg',
		// 'https://s.yimg.com/uu/api/res/1.2/ILd9Pym0S7eqKz6H74nZrw--~B/Zmk9c3RyaW07aD02MjA7cT05NTt3PTExMDQ7YXBwaWQ9eXRhY2h5b24-/https://s.yimg.com/os/creatr-uploaded-images/2025-06/84ef5c90-55bb-11f0-bfef-3be31813baf0.cf.webp',
		// 'https://eclecticlight.co/wp-content/uploads/2025/06/safari2004.jpg',
	];

	const testImageUrl = testImageUrls[testImageUrls.length - 1];

	// const qualities = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50];
	const qualities = [1, 40];

	localTest(
		'should output images at different qualities for visual comparison',
		async () => {
			for (const quality of qualities) {
				const result = await processImageFromUrl(testImageUrl, {
					width: 360,
					height: 240,
					quality,
					effort: 6,
					reductionEffort: 6,
					nearLossless: false,
					smartSubsample: false,
					// grayscale: true,
					preset: 'text',
					// alphaQuality: 0,
					monotone: quality >= 10,
				});
				const outPath = path.join(
					TEST_OUTPUT_DIR,
					`image-quality-${quality}.webp`
				);
				fs.writeFileSync(outPath, result.buffer);
				console.log(`Saved ${outPath} (${result.buffer.length} bytes)`);
			}
		},
		20000 //test timeout
	);
});
