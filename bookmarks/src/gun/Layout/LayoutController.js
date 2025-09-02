import { Layout } from './Layout.js';

/**
 * LayoutController
 * Creates the layout and provides containers to other controllers
 */
export class LayoutController {
	constructor() {
		// Create Layout component
		this.ui = new Layout();

		// Render layout into body
		this.containers = this.ui.render(document.body);
	}
}
