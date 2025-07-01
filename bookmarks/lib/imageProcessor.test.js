import 'dotenv/config';
import { processImageFromUrl } from './imageProcessor.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const localTest = process.env.IS_LOCAL ? test : test.skip;

describe('processImageFromUrl', () => {
	const testImageUrl =
		'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/320px-PNG_transparency_demonstration_1.png';

	it('should download, resize, and compress an image to WEBP', async () => {
		const buffer = await processImageFromUrl(testImageUrl, {
			width: 240,
			height: 160,
			quality: 50,
		});
		expect(Buffer.isBuffer(buffer)).toBe(true);
		// Check that the buffer is a WEBP image
		const metadata = await sharp(buffer).metadata();
		expect(metadata.format).toBe('webp');
		expect(metadata.width).toBe(240);
		expect(metadata.height).toBe(160);
		// Should be reasonably small
		expect(buffer.length).toBeLessThan(20000);
	});

	it('should throw for an invalid URL', async () => {
		await expect(
			processImageFromUrl('https://invalid.example.com/image.png')
		).rejects.toThrow();
	});

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
				const buffer = await processImageFromUrl(testImageUrl, {
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
					process.cwd(),
					`test-output-${quality}.webp`
				);
				fs.writeFileSync(outPath, buffer);
				console.log(`Saved ${outPath} (${buffer.length} bytes)`);
			}
		},
		20000 //test timeout
	);
});
