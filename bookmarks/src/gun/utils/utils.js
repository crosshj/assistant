// Utility functions for GunDB application

export const $ = (id) => document.getElementById(id);

export const log = (msg) => {
	const li = document.createElement('li');
	li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
	$('log').prepend(li);
	console.log(msg);
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
