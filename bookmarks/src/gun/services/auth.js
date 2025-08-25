import { log, $, uuid } from '../lib/utils.js';

// Authentication Management
export class AuthManager {
	constructor(user, stateManager) {
		this.user = user;
		this.stateManager = stateManager;
	}

	createIdentity(alias = null) {
		const userAlias = alias || `u_${uuid().slice(0, 6)}`;
		const pass = crypto.getRandomValues(new Uint8Array(16)).join('');

		this.user.create(userAlias, pass, (ack) => {
			if (ack.err) {
				log('create error ' + ack.err);
				return;
			}

			this.login(userAlias, pass);
		});
	}

	login(alias, pass) {
		if (!alias || !pass) {
			log('set alias or create identity');
			return;
		}

		this.user.auth(alias, pass, ({ err }) => {
			if (err) {
				log('auth error ' + err);
			} else {
				log('logged in as ' + alias);

				// Update state to reflect authentication
				this.stateManager.setAuthAuthenticated(alias);

				// Save credentials for auto-login
				localStorage.setItem(
					'gun_demo_creds',
					JSON.stringify({ alias, pass })
				);
			}
		});
	}

	autoLogin() {
		const saved = this.tryJSON(localStorage.getItem('gun_demo_creds'));
		if (saved) {
			this.user.auth(saved.alias, saved.pass, ({ err }) => {
				if (err) {
					log('auth error ' + err);
				} else {
					log('logged in as ' + saved.alias);

					// Update state to reflect authentication
					this.stateManager.setAuthAuthenticated(saved.alias);
				}
			});
		}
	}

	tryJSON(t, d) {
		try {
			return t ? JSON.parse(t) : d;
		} catch {
			return d;
		}
	}

	getCurrentUser() {
		return this.user.is ? this.user.is.alias : 'anon';
	}

	isAuthenticated() {
		return !!this.user.is;
	}

	logout() {
		this.user.leave();
		log('logged out');

		// Update state to reflect logout
		this.stateManager.setAuthAnonymous();
	}
}
