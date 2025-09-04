import { log, addEventListener, dispatchEvent } from '../_lib/utils.js';
import { FileTree } from './FileTree.js';

/**
 */
export class FileTreeController {
	constructor() {
		this.ui = new FileTree();

		// Bind controller methods

		// Setup event listeners
		this.setupEventListeners();
	}

	setupEventListeners() {}

	setupUIEventDelegation() {}
}
