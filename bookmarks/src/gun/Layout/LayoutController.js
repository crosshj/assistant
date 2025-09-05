import { Layout } from './Layout.js';
import { FileTree } from '../FileTree/FileTree.js';
import { GraphView } from '../GraphView/GraphView.js';

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

		// Initialize sidebar components
		this.initializeSidebarComponents();
		this.setupToggleListener();
	}

	initializeSidebarComponents() {
		// Create FileTree component
		try {
			this.filetree = new FileTree();
		} catch (error) {
			console.warn('Failed to initialize FileTree:', error);
		}

		// Create GraphView component
		try {
			this.graphview = new GraphView();
		} catch (error) {
			console.warn('Failed to initialize GraphView:', error);
		}
	}

	setupToggleListener() {
		const toggleBtn = document.getElementById('sidebar-toggle');
		if (toggleBtn) {
			toggleBtn.addEventListener('click', () => {
				this.ui.toggleView();
			});
		}
	}
}
