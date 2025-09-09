// Copy of utils from gun page for consistency
export function dispatchEvent(eventName, detail = null) {
	const event = new CustomEvent(eventName, { detail });
	document.dispatchEvent(event);
}

export function addEventListener(eventName, handler) {
	document.addEventListener(eventName, handler);
}

/**
 * Tagged template literal for HTML generation.
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {string}
 */
export const html = (strings, ...values) => {
	let result = '';
	for (let i = 0; i < strings.length; i++) {
		result += strings[i];
		if (i < values.length) {
			result += values[i];
		}
	}
	return result;
};
