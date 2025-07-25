import { sanitizeDescription, sanitizeTitle } from './sanitizer.js';

describe('sanitizer', () => {
	describe('sanitizeDescription', () => {
		it('should remove all HTML tags and preserve text content', () => {
			const input =
				'<p>This is a <strong>bold</strong> description with <a href="http://example.com">links</a>.</p>';
			const expected = 'This is a bold description with links.';
			expect(sanitizeDescription(input)).toBe(expected);
		});

		it('should handle HTML entities', () => {
			const input = 'Description with &amp; &lt; &gt; &quot; entities';
			const expected = 'Description with & < > " entities';
			expect(sanitizeDescription(input)).toBe(expected);
		});

		it('should handle multiple spaces and line breaks', () => {
			const input = '<p>Multiple    spaces\n\nand\nline breaks</p>';
			const expected = 'Multiple spaces and line breaks';
			expect(sanitizeDescription(input)).toBe(expected);
		});

		it('should truncate long descriptions', () => {
			const longText = 'A'.repeat(600);
			const result = sanitizeDescription(longText);
			expect(result.length).toBeLessThanOrEqual(503); // 500 + 3 for "..."
			expect(result.endsWith('...')).toBe(true);
		});

		it('should handle empty or null input', () => {
			expect(sanitizeDescription('')).toBe('');
			expect(sanitizeDescription(null)).toBe('');
			expect(sanitizeDescription(undefined)).toBe('');
		});

		it('should handle malicious script tags', () => {
			const input =
				'<script>alert("xss")</script>Description<script>evil()</script>';
			const expected = 'Description';
			expect(sanitizeDescription(input)).toBe(expected);
		});

		it('should handle complex nested HTML', () => {
			const input =
				'<div><p><span>Nested <b>HTML</b> with <i>formatting</i></span></p></div>';
			const expected = 'Nested HTML with formatting';
			expect(sanitizeDescription(input)).toBe(expected);
		});

		it('should respect custom maxLength option', () => {
			const input = 'A'.repeat(100);
			const result = sanitizeDescription(input, { maxLength: 50 });
			expect(result.length).toBeLessThanOrEqual(53); // 50 + 3 for "..."
		});
	});

	describe('sanitizeTitle', () => {
		it('should allow basic formatting tags', () => {
			const input = 'Title with <b>bold</b> and <i>italic</i> text';
			const expected = 'Title with <b>bold</b> and <i>italic</i> text';
			expect(sanitizeTitle(input)).toBe(expected);
		});

		it('should remove dangerous tags while keeping safe ones', () => {
			const input =
				'Title <script>alert("xss")</script> with <b>bold</b> text';
			const expected = 'Title with <b>bold</b> text';
			expect(sanitizeTitle(input)).toBe(expected);
		});

		it('should handle HTML entities', () => {
			const input = 'Title with &amp; &lt; &gt; entities';
			const expected = 'Title with & < > entities';
			expect(sanitizeTitle(input)).toBe(expected);
		});

		it('should truncate long titles', () => {
			const longTitle = 'A'.repeat(250);
			const result = sanitizeTitle(longTitle);
			expect(result.length).toBeLessThanOrEqual(203); // 200 + 3 for "..."
			expect(result.endsWith('...')).toBe(true);
		});

		it('should handle empty or null input', () => {
			expect(sanitizeTitle('')).toBe('');
			expect(sanitizeTitle(null)).toBe('');
			expect(sanitizeTitle(undefined)).toBe('');
		});

		it('should clean up multiple spaces', () => {
			const input = 'Title    with    multiple    spaces';
			const expected = 'Title with multiple spaces';
			expect(sanitizeTitle(input)).toBe(expected);
		});
	});

	describe('edge cases', () => {
		it('should handle malformed HTML gracefully', () => {
			const input = '<p>Unclosed tag <b>bold text <i>italic';
			const expected = 'Unclosed tag bold text italic';
			expect(sanitizeDescription(input)).toBe(expected);
		});

		it('should handle non-string input gracefully', () => {
			expect(sanitizeDescription(123)).toBe('');
			expect(sanitizeDescription({})).toBe('');
			expect(sanitizeTitle(123)).toBe('');
			expect(sanitizeTitle({})).toBe('');
		});

		it('should handle special characters', () => {
			const input = 'Title with special chars: &copy; &trade; &reg;';
			const expected = 'Title with special chars: © ™ ®';
			expect(sanitizeDescription(input)).toBe(expected);
		});
	});
});
