// Test file for URL resolution functionality
// This tests the core URL resolution logic that's used in metadataExtractor

describe('URL Resolution', () => {
	// Helper function to resolve relative URLs (same as in metadataExtractor.js)
	function resolveUrl(src, baseUrl) {
		try {
			// Handle null/undefined gracefully
			if (src == null) return src;
			return new URL(src, baseUrl).href;
		} catch {
			return src;
		}
	}

	describe('resolveUrl function', () => {
		it('should resolve relative SVG URLs to absolute URLs', () => {
			const result = resolveUrl(
				'y18.svg',
				'https://news.ycombinator.com/'
			);
			expect(result).toBe('https://news.ycombinator.com/y18.svg');
		});

		it('should resolve relative paths with ../ notation', () => {
			const result = resolveUrl(
				'../images/logo.png',
				'https://example.com/page/article'
			);
			expect(result).toBe('https://example.com/images/logo.png');
		});

		it('should resolve root-relative URLs correctly', () => {
			const result = resolveUrl(
				'/static/hero.webp',
				'https://blog.com/posts/article'
			);
			expect(result).toBe('https://blog.com/static/hero.webp');
		});

		it('should leave absolute URLs unchanged', () => {
			const result = resolveUrl(
				'https://cdn.example.com/image.jpg',
				'https://site.com/'
			);
			expect(result).toBe('https://cdn.example.com/image.jpg');
		});

		it('should handle complex relative paths', () => {
			const result = resolveUrl(
				'../../assets/images/banner.png',
				'https://example.com/blog/2024/january/'
			);
			// URL resolution works from the directory, so ../../ from /blog/2024/january/ goes to /blog/
			expect(result).toBe(
				'https://example.com/blog/assets/images/banner.png'
			);
		});

		it('should handle query parameters in relative URLs', () => {
			const result = resolveUrl(
				'image.jpg?v=123',
				'https://example.com/'
			);
			expect(result).toBe('https://example.com/image.jpg?v=123');
		});

		it('should handle fragments in relative URLs', () => {
			const result = resolveUrl(
				'page.html#section',
				'https://example.com/'
			);
			expect(result).toBe('https://example.com/page.html#section');
		});

		it('should handle base URLs with paths', () => {
			const result = resolveUrl(
				'image.png',
				'https://example.com/blog/posts/'
			);
			expect(result).toBe('https://example.com/blog/posts/image.png');
		});

		it('should handle base URLs without trailing slash', () => {
			const result = resolveUrl('image.png', 'https://example.com/blog');
			expect(result).toBe('https://example.com/image.png');
		});

		it('should handle protocol-relative URLs', () => {
			const result = resolveUrl(
				'//cdn.example.com/image.jpg',
				'https://site.com/'
			);
			expect(result).toBe('https://cdn.example.com/image.jpg');
		});

		it('should handle empty or null URLs gracefully', () => {
			expect(resolveUrl('', 'https://example.com/')).toBe(
				'https://example.com/'
			);
			expect(resolveUrl(null, 'https://example.com/')).toBe(null);
			expect(resolveUrl(undefined, 'https://example.com/')).toBe(
				undefined
			);
		});

		it('should handle malformed base URLs gracefully', () => {
			const result = resolveUrl('image.png', 'not-a-valid-url');
			// Should return original URL when base URL is invalid
			expect(result).toBe('image.png');
		});

		it('should handle edge case URLs', () => {
			// Test with special characters
			expect(
				resolveUrl('image with spaces.jpg', 'https://example.com/')
			).toBe('https://example.com/image%20with%20spaces.jpg');

			// Test with Unicode characters
			expect(resolveUrl('图片.jpg', 'https://example.com/')).toBe(
				'https://example.com/%E5%9B%BE%E7%89%87.jpg'
			);
		});

		it('should handle different protocols', () => {
			expect(resolveUrl('image.jpg', 'http://example.com/')).toBe(
				'http://example.com/image.jpg'
			);

			expect(resolveUrl('image.jpg', 'https://example.com/')).toBe(
				'https://example.com/image.jpg'
			);
		});

		it('should handle ports in base URLs', () => {
			const result = resolveUrl('image.jpg', 'https://example.com:8080/');
			expect(result).toBe('https://example.com:8080/image.jpg');
		});

		it('should handle subdomains correctly', () => {
			const result = resolveUrl(
				'image.jpg',
				'https://blog.example.com/posts/'
			);
			expect(result).toBe('https://blog.example.com/posts/image.jpg');
		});
	});

	describe('Real-world URL scenarios', () => {
		const testCases = [
			// [baseUrl, imageUrl, expected, description]
			[
				'https://news.ycombinator.com/',
				'y18.svg',
				'https://news.ycombinator.com/y18.svg',
				'Hacker News SVG',
			],
			[
				'https://github.com/user/repo',
				'../assets/logo.png',
				'https://github.com/assets/logo.png',
				'GitHub relative path',
			],
			[
				'https://medium.com/@author/article',
				'/img/header.jpg',
				'https://medium.com/img/header.jpg',
				'Medium root-relative',
			],
			[
				'https://dev.to/article',
				'https://res.cloudinary.com/image.jpg',
				'https://res.cloudinary.com/image.jpg',
				'Dev.to CDN image',
			],
			[
				'https://stackoverflow.com/questions/123',
				'../../img/icon.svg',
				'https://stackoverflow.com/img/icon.svg',
				'Stack Overflow nested path',
			],
		];

		testCases.forEach(([baseUrl, imageUrl, expected, description]) => {
			it(`should handle ${description}`, () => {
				const result = resolveUrl(imageUrl, baseUrl);
				expect(result).toBe(expected);
			});
		});
	});
});
