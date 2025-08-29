// Utility functions for GunDB application

export const $ = (id) => document.getElementById(id);

export const log = (msg) => {
	// Fire event for ActivityController to handle instead of direct DOM manipulation
	document.dispatchEvent(
		new CustomEvent('activity:log', {
			detail: { message: msg, type: 'info' },
		})
	);
};

export const dispatchEvent = (eventName, detail = null) => {
	document.dispatchEvent(new CustomEvent(eventName, { detail }));
};

export const addEventListener = (eventName, callback) => {
	document.addEventListener(eventName, callback);
	return () => document.removeEventListener(eventName, callback); // Return cleanup function
};

export const uuid = () =>
	crypto.randomUUID
		? crypto.randomUUID()
		: Math.random().toString(16).slice(2) + Date.now().toString(16);

export const tryJSONParse = (t, d) => {
	try {
		return t ? JSON.parse(t) : d;
	} catch {
		return d;
	}
};

export const DEFAULT_PEERS = [
	'https://gun-manhattan.herokuapp.com/gun',
	'https://gun-us.herokuapp.com/gun',
	'https://gun-eu.herokuapp.com/gun',
];

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
