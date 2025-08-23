// Utility functions for GunDB application

export const $ = (id) => document.getElementById(id);

export const log = (msg) => {
	const li = document.createElement('li');
	const now = new Date();
	const timestamp =
		now.getHours().toString().padStart(2, '0') +
		':' +
		now.getMinutes().toString().padStart(2, '0') +
		':' +
		now.getSeconds().toString().padStart(2, '0') +
		'.' +
		now.getMilliseconds().toString().padStart(3, '0');

	// Create timestamp element with more visible styling
	const timeSpan = document.createElement('span');
	timeSpan.textContent = timestamp;
	timeSpan.style.cssText =
		'color: #999; font-size: 0.9em; display: block; margin-bottom: 3px; font-family: monospace;';

	// Create message element
	const msgSpan = document.createElement('span');
	msgSpan.textContent = msg;

	// Clear the list item and append both elements
	li.innerHTML = '';
	li.appendChild(timeSpan);
	li.appendChild(msgSpan);

	$('log').prepend(li);
	// console.log(msg);
};

export const uuid = () =>
	crypto.randomUUID
		? crypto.randomUUID()
		: Math.random().toString(16).slice(2) + Date.now().toString(16);

export const tryJSON = (t, d) => {
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
