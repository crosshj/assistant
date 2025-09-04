import { log, addEventListener, dispatchEvent } from '../_lib/utils.js';
import { GraphView } from './GraphView.js';

/**
 */
export class GraphViewController {
	constructor() {
		this.ui = new GraphView();

		// Bind controller methods

		// Setup event listeners
		this.setupEventListeners();
	}

	setupEventListeners() {}

	setupUIEventDelegation() {}
}
