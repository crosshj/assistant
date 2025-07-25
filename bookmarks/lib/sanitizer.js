import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize HTML content to plain text
 * Removes all HTML tags while preserving text content
 *
 * @param {string} html - The HTML string to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized plain text
 */
export function sanitizeDescription(html, options = {}) {
	if (!html || typeof html !== 'string') {
		return '';
	}

	try {
		// Remove script and style content completely
		let sanitized = html
			.replace(/<script[^>]*>.*?<\/script>/gi, ' ') // Remove script tags and content
			.replace(/<style[^>]*>.*?<\/style>/gi, ' ') // Remove style tags and content
			.replace(/<[^>]*>/g, ' ') // Replace remaining HTML tags with spaces
			.replace(/\s+/g, ' ') // Normalize multiple spaces
			.replace(/\s+\./g, '.') // Remove spaces before periods
			.replace(/\s+,/g, ',') // Remove spaces before commas
			.replace(/\s+;/g, ';') // Remove spaces before semicolons
			.replace(/\s+:/g, ':') // Remove spaces before colons
			.replace(/\s+!/g, '!') // Remove spaces before exclamation marks
			.replace(/\s+\?/g, '?') // Remove spaces before question marks
			.trim();

		// Decode HTML entities
		sanitized = decodeHtmlEntities(sanitized);

		// Limit description length to prevent UI issues
		const maxLength = options.maxLength || 500;
		if (sanitized.length > maxLength) {
			sanitized = sanitized.substring(0, maxLength).trim();
			// Add ellipsis if we truncated
			if (!sanitized.endsWith('...')) {
				sanitized += '...';
			}
		}

		return sanitized;
	} catch (error) {
		console.error('Error sanitizing description:', error);
		// Fallback: basic HTML tag removal
		return html.replace(/<[^>]*>/g, '').trim();
	}
}

/**
 * Decode common HTML entities to their character equivalents
 *
 * @param {string} text - Text containing HTML entities
 * @returns {string} - Text with decoded entities
 */
function decodeHtmlEntities(text) {
	const entities = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&nbsp;': ' ',
		'&hellip;': '...',
		'&mdash;': '—',
		'&ndash;': '–',
		'&lsquo;': "'",
		'&rsquo;': "'",
		'&ldquo;': '"',
		'&rdquo;': '"',
		'&copy;': '©',
		'&trade;': '™',
		'&reg;': '®',
		'&deg;': '°',
		'&plusmn;': '±',
		'&times;': '×',
		'&divide;': '÷',
		'&frac12;': '½',
		'&frac14;': '¼',
		'&frac34;': '¾',
		'&sup1;': '¹',
		'&sup2;': '²',
		'&sup3;': '³',
		'&micro;': 'µ',
		'&para;': '¶',
		'&sect;': '§',
		'&bull;': '•',
		'&hellip;': '…',
		'&prime;': '′',
		'&Prime;': '″',
		'&oline;': '‾',
		'&frasl;': '⁄',
		'&weierp;': '℘',
		'&image;': 'ℑ',
		'&real;': 'ℜ',
		'&trade;': '™',
		'&alefsym;': 'ℵ',
		'&larr;': '←',
		'&uarr;': '↑',
		'&rarr;': '→',
		'&darr;': '↓',
		'&harr;': '↔',
		'&crarr;': '↵',
		'&lArr;': '⇐',
		'&uArr;': '⇑',
		'&rArr;': '⇒',
		'&dArr;': '⇓',
		'&hArr;': '⇔',
		'&forall;': '∀',
		'&part;': '∂',
		'&exist;': '∃',
		'&empty;': '∅',
		'&nabla;': '∇',
		'&isin;': '∈',
		'&notin;': '∉',
		'&ni;': '∋',
		'&prod;': '∏',
		'&sum;': '∑',
		'&minus;': '−',
		'&lowast;': '∗',
		'&radic;': '√',
		'&prop;': '∝',
		'&infin;': '∞',
		'&ang;': '∠',
		'&and;': '∧',
		'&or;': '∨',
		'&cap;': '∩',
		'&cup;': '∪',
		'&int;': '∫',
		'&there4;': '∴',
		'&sim;': '∼',
		'&cong;': '≅',
		'&asymp;': '≈',
		'&ne;': '≠',
		'&equiv;': '≡',
		'&le;': '≤',
		'&ge;': '≥',
		'&sub;': '⊂',
		'&sup;': '⊃',
		'&nsub;': '⊄',
		'&sube;': '⊆',
		'&supe;': '⊇',
		'&oplus;': '⊕',
		'&otimes;': '⊗',
		'&perp;': '⊥',
		'&sdot;': '⋅',
		'&lceil;': '⌈',
		'&rceil;': '⌉',
		'&lfloor;': '⌊',
		'&rfloor;': '⌋',
		'&lang;': '〈',
		'&rang;': '〉',
		'&loz;': '◊',
		'&spades;': '♠',
		'&clubs;': '♣',
		'&hearts;': '♥',
		'&diams;': '♦',
	};

	return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
		return entities[entity] || entity;
	});
}

/**
 * Sanitize title content (more permissive than description)
 * Allows basic formatting but removes potentially dangerous content
 *
 * @param {string} html - The HTML string to sanitize
 * @returns {string} - Sanitized title
 */
export function sanitizeTitle(html) {
	if (!html || typeof html !== 'string') {
		return '';
	}

	try {
		// Remove dangerous tags but keep basic formatting
		let sanitized = html
			.replace(/<script[^>]*>.*?<\/script>/gi, ' ') // Remove script tags
			.replace(/<style[^>]*>.*?<\/style>/gi, ' ') // Remove style tags
			.replace(/<iframe[^>]*>.*?<\/iframe>/gi, ' ') // Remove iframe tags
			.replace(/<object[^>]*>.*?<\/object>/gi, ' ') // Remove object tags
			.replace(/<embed[^>]*>/gi, ' ') // Remove embed tags
			.replace(/<link[^>]*>/gi, ' ') // Remove link tags
			.replace(/<meta[^>]*>/gi, ' ') // Remove meta tags
			.replace(/\s+/g, ' ') // Normalize multiple spaces
			.trim();

		// Decode HTML entities
		sanitized = decodeHtmlEntities(sanitized);

		// Limit title length
		const maxLength = 200;
		if (sanitized.length > maxLength) {
			sanitized = sanitized.substring(0, maxLength).trim();
			if (!sanitized.endsWith('...')) {
				sanitized += '...';
			}
		}

		return sanitized;
	} catch (error) {
		console.error('Error sanitizing title:', error);
		return html.replace(/<[^>]*>/g, '').trim();
	}
}
