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

/**
 * Sets up event binding utilities on a UI component
 * @param {Object} ui - UI component instance
 */
export function setupEventUtilities(ui) {
	// Core binding method
	ui.bind = (eventType, handlers) => {
		ui.container.addEventListener(eventType, (e) => {
			const is = (selector) =>
				e.target.matches(selector) || e.target.closest(selector);
			for (const [selector, handlerOrHandlers] of Object.entries(
				handlers
			)) {
				if (is(selector)) {
					// Support both single handler and array of handlers
					const handlersToCall = Array.isArray(handlerOrHandlers)
						? handlerOrHandlers
						: [handlerOrHandlers];

					// Call all handlers in order
					handlersToCall.forEach((handler) => handler(e));
					break;
				}
			}
		});
	};
}
