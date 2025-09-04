# Migration to App-Scoped Authentication with Links-as-Nodes

## Overview

This document outlines the migration from room-based architecture to app-scoped authentication with Obsidian-style markdown links as nodes. This approach will simplify the codebase, improve edge reliability, and enable natural content-based relationship discovery.

## Current vs. Target Architecture

### Current (Room-Based)

```javascript
// Complex 3-level hierarchy with room management
gun.get('graphs').get('roomName').get('nodes')
gun.get('graphs').get('roomName').get('edges')

// Requires:
- Room selection UI
- Room management logic
- Multi-room sync coordination
- Room-based permissions
```

### Target (App-Scoped + Links-as-Nodes)

```javascript
// Separate namespaces under app user for performance
gun.user().get('nodes')     // Content nodes with markdown
gun.user().get('edges')     // Explicit relationships

// Enhanced node structure with content
const knowledgeNode = {
    id: 'ml-fundamentals',
    title: 'Machine Learning Fundamentals',
    content: `
        # Machine Learning Fundamentals

        Core concepts include [[Neural Networks]] and [[Deep Learning]].
        See also: [[Regression Analysis]] for supervised learning.

        #ai #research #fundamentals
    `,
    // Auto-extracted from content
    wikiLinks: [
        { target: 'neural-networks', text: 'Neural Networks' },
        { target: 'deep-learning', text: 'Deep Learning' },
        { target: 'regression-analysis', text: 'Regression Analysis' }
    ],
    tags: ['ai', 'research', 'fundamentals'],
    updatedAt: Date.now()
};

// Benefits:
- Natural content-based relationships via [[wiki links]]
- Separate namespaces for optimal performance
- Auto-discovery of connections from content
- Manual edges still available for structured relationships
- Better reliability (user-scoped data)
```

## Migration Steps

### 1. Update Authentication System

**File: `src/gun/services/auth.js`**

-   Add app-level authentication constants
-   Implement `autoLoginApp()` method
-   Implement `createAppUser()` method
-   Update `autoLogin()` to use app credentials instead of individual users

```javascript
// Add these properties to AuthManager
this.APP_ALIAS = 'bookmarks-app-v1';
this.APP_SECRET = process.env.GUN_APP_PASSWORD || 'fallback-dev-password';
```

### 2. Remove Room Management

**Files to Remove:**

-   `src/gun/services/room.js` - Entire RoomManager class
-   `src/gun/components/RoomList.js` - Room selection UI
-   Room-related UI elements in header components

**Files to Update:**

-   `src/gun/gun.js` - Remove room manager initialization
-   `src/gun/services/stateManager.js` - Remove currentRoom state
-   `src/gun/components/header/Header.js` - Remove room selection UI

### 3. Implement Link Discovery Service

**New File: `src/gun/services/linkDiscovery.js`**

Create service to extract wiki links and tags from content:

```javascript
export class LinkDiscovery {
	extractWikiLinks(content) {
		const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
		const links = [];
		let match;

		while ((match = wikiLinkRegex.exec(content)) !== null) {
			const linkText = match[1].trim();
			const targetId = this.textToId(linkText);
			links.push({
				target: targetId,
				text: linkText,
				type: 'wiki-link',
			});
		}

		return links;
	}

	extractTags(content) {
		const tagRegex = /#([a-zA-Z0-9_-]+)/g;
		const tags = [];
		let match;

		while ((match = tagRegex.exec(content)) !== null) {
			tags.push(match[1]);
		}

		return tags;
	}

	textToId(text) {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}
}
```

### 4. Update Data Operations with Content Support

**File: `src/gun/services/graphOperations.js`**

-   Remove room manager dependency from constructor
-   Add link discovery service
-   Update node structure to include content and extracted links
-   Use separate namespaces: `gun.user().get('nodes')` and `gun.user().get('edges')`

```javascript
export class GraphOperations {
	constructor(gunConnection, authManager) {
		this.gun = gunConnection.gun;
		this.authManager = authManager;
		this.linkDiscovery = new LinkDiscovery();
	}

	upsertNode({ id, title, content, props }) {
		const nodeId = id || this.linkDiscovery.textToId(title);

		// Extract links and tags from content
		const wikiLinks = this.linkDiscovery.extractWikiLinks(content || '');
		const tags = this.linkDiscovery.extractTags(content || '');

		const node = {
			id: nodeId,
			title: title || '',
			content: content || '',
			wikiLinks,
			tags,
			props: props || {},
			updatedAt: Date.now(),
			by: this.authManager.getCurrentUser(),
		};

		// Store in nodes namespace
		this.gun.user().get('nodes').get(nodeId).put(node);
		return nodeId;
	}

	upsertEdge({ id, from, to, label, direction, props }) {
		const edgeId = id || uuid();
		const edge = {
			id: edgeId,
			from,
			to,
			label,
			direction,
			props: props || {},
			updatedAt: Date.now(),
			by: this.authManager.getCurrentUser(),
		};

		// Store in edges namespace
		this.gun.user().get('edges').get(edgeId).put(edge);
		return edgeId;
	}
}
```

### 5. Update Data Synchronization with Link Processing

**File: `src/gun/services/sync.js`**

-   Remove room-based subscription logic
-   Implement separate namespace subscriptions
-   Add computed edge generation from wiki links
-   Process both content-based and explicit relationships

```javascript
export class DataSync {
	constructor(gunConnection, stateManager) {
		this.gun = gunConnection.gun;
		this.stateManager = stateManager;
		this.linkDiscovery = new LinkDiscovery();
	}

	start() {
		// Subscribe to nodes namespace
		this.gun
			.user()
			.get('nodes')
			.map()
			.on((data, id) => {
				if (data && Object.keys(data).length > 0) {
					this.emit('addNode', { data, id });

					// Generate computed edges from wiki links
					this.processWikiLinks(data, id);
				} else {
					this.emit('removeNode', { id });
				}
			});

		// Subscribe to edges namespace
		this.gun
			.user()
			.get('edges')
			.map()
			.on((data, id) => {
				if (data && Object.keys(data).length > 0) {
					this.emit('addEdge', {
						data: { ...data, type: 'explicit' },
						id,
					});
				} else {
					this.emit('removeEdge', { id });
				}
			});
	}

	processWikiLinks(nodeData, nodeId) {
		// Generate computed edges from wiki links
		if (nodeData.wikiLinks) {
			nodeData.wikiLinks.forEach((link, index) => {
				const computedEdge = {
					id: `computed_${nodeId}_${index}`,
					from: nodeId,
					to: link.target,
					label: link.text,
					type: 'computed',
					direction: 'forward',
					source: 'wiki-link',
				};

				this.emit('addEdge', {
					data: computedEdge,
					id: computedEdge.id,
				});
			});
		}
	}
}
```

### 5. Update GunDB Wrapper

**File: `src/gun/services/gunWrapper.js`**

-   Remove room parameters from all methods
-   Update data paths to use user scope
-   Simplify node/edge retrieval methods
-   Remove room-based query methods

### 6. Update UI for Content-Based Nodes

**Files to Update:**

-   Remove room selection dropdowns and "Join Room" buttons
-   Add content editing capabilities (rich text or markdown editor)
-   Update node forms to include title and content fields
-   Add live link preview (show [[Link]] targets)
-   Remove room-related event handlers

**Enhanced Node Form (`gun.html`):**

```html
<details open>
	<summary><b>New Knowledge Node</b></summary>
	<div
		class="row"
		style="margin: 0.5rem 0"
	>
		<input
			id="nodeId"
			class="mono"
			placeholder="node id (auto from title)"
		/>
		<input
			id="nodeTitle"
			placeholder="Node Title"
		/>
	</div>

	<label>Content (Markdown with [[Wiki Links]])</label>
	<textarea
		id="nodeContent"
		rows="8"
		placeholder="# Node Title

Write your content here with [[Wiki Links]] to other nodes.

Use #hashtags for categorization.

See [[Related Topic]] for more information."
	></textarea>

	<label>Props (JSON object)</label>
	<textarea
		id="nodeProps"
		class="mono"
		rows="3"
		placeholder='{"color":"blue"}'
	></textarea>

	<div class="row">
		<button
			id="addNode"
			class="primary"
		>
			Create Node
		</button>
		<button id="delNode">Delete Node</button>
	</div>
</details>
```

### 7. Update Event System

**File: `src/gun/services/eventCoordinator.js`**

-   Remove room-related event handling
-   Simplify authentication flow events
-   Remove room change coordination
-   Update component initialization (no room manager)

### 8. Data Migration with Content Enhancement

**Create migration script:**

```javascript
// Migrate existing room data to app scope with content enhancement
async function migrateData() {
	// 1. Authenticate as app
	await auth.autoLoginApp();

	// 2. Export existing room data
	const existingNodes = await gun
		.get('graphs')
		.get('public')
		.get('nodes')
		.once();
	const existingEdges = await gun
		.get('graphs')
		.get('public')
		.get('edges')
		.once();

	// 3. Transform nodes to include content structure
	const linkDiscovery = new LinkDiscovery();
	const enhancedNodes = {};

	if (existingNodes) {
		Object.entries(existingNodes).forEach(([id, node]) => {
			// Convert existing nodes to content-based structure
			enhancedNodes[id] = {
				...node,
				title: node.label || node.title || 'Untitled',
				content:
					node.content ||
					`# ${node.label || 'Untitled'}\n\nContent to be added...`,
				wikiLinks: linkDiscovery.extractWikiLinks(node.content || ''),
				tags: linkDiscovery.extractTags(node.content || ''),
			};
		});

		// Import enhanced nodes to app scope
		await gun.user().get('nodes').put(enhancedNodes);
	}

	// 4. Import edges to separate namespace
	if (existingEdges) {
		await gun.user().get('edges').put(existingEdges);
	}

	console.log('✅ Migration complete with content enhancement');
}
```

## Password Management During Build

### Development Environment

**Option 1: Environment Variables**

```bash
# .env file (not committed to git)
GUN_APP_PASSWORD=your-development-password-here

# In auth.js
this.APP_SECRET = process.env.GUN_APP_PASSWORD || 'dev-fallback-password';
```

**Option 2: Config File**

```javascript
// config/app-secrets.js (gitignored)
export const APP_CONFIG = {
	gunPassword: 'your-development-password',
};

// In auth.js
import { APP_CONFIG } from '../config/app-secrets.js';
this.APP_SECRET = APP_CONFIG.gunPassword;
```

### Production Deployment

**Option 1: Build-Time Injection**

```javascript
// vite.config.js or webpack config
export default {
    define: {
        'process.env.GUN_APP_PASSWORD': JSON.stringify(process.env.GUN_APP_PASSWORD)
    }
}

// Deploy with:
GUN_APP_PASSWORD=your-production-password npm run build
```

**Option 2: Runtime Environment Detection**

```javascript
// In auth.js
getAppPassword() {
    // Production: Use environment variable
    if (process.env.NODE_ENV === 'production') {
        return process.env.GUN_APP_PASSWORD;
    }

    // Development: Use local config or fallback
    return this.getDevPassword();
}

getDevPassword() {
    // Try local storage first (for development persistence)
    const stored = localStorage.getItem('gun_app_dev_password');
    if (stored) return stored;

    // Generate and store a development password
    const devPassword = 'dev-' + Math.random().toString(36).substring(7);
    localStorage.setItem('gun_app_dev_password', devPassword);
    return devPassword;
}
```

**Option 3: Vercel/Netlify Environment Variables**

```bash
# Set in deployment platform dashboard
GUN_APP_PASSWORD=your-secure-production-password

# Access in code
this.APP_SECRET = process.env.GUN_APP_PASSWORD || this.generateFallbackPassword();
```

### Security Best Practices

1. **Never commit passwords to git**
    - Add password files to `.gitignore`
    - Use environment variables for production
2. **Use strong passwords in production**

    ```javascript
    // Generate secure password
    const crypto = require('crypto');
    const password = crypto.randomBytes(32).toString('hex');
    ```

3. **Rotate passwords periodically**

    - Version your app alias: `bookmarks-app-v2`
    - Migrate data between versions when rotating

4. **Consider password derivation**
    ```javascript
    // Derive password from app version + secret
    const appVersion = 'v1.2.0';
    const secret = process.env.APP_SECRET_KEY;
    const password = crypto
    	.createHash('sha256')
    	.update(appVersion + secret)
    	.digest('hex');
    ```

## Testing Migration

### 1. Backup Current Data

```javascript
// Export current room data before migration
const backup = {
	nodes: await gun.get('graphs').get('public').get('nodes').once(),
	edges: await gun.get('graphs').get('public').get('edges').once(),
};
localStorage.setItem('pre_migration_backup', JSON.stringify(backup));
```

### 2. Parallel Testing

-   Keep old system working during migration
-   Test new app-scoped system alongside old room system
-   Compare data consistency between both approaches

### 3. Rollback Plan

-   Keep room-based code in git branches
-   Maintain data export/import functionality
-   Test rollback procedure before going live

## Expected Benefits Post-Migration

### Performance Improvements

-   ✅ Faster data queries (shorter paths with separate namespaces)
-   ✅ Better caching (user-scoped localStorage)
-   ✅ Targeted sync (nodes vs edges loaded independently)
-   ✅ Reduced network overhead (no room coordination)

### Reliability Improvements

-   ✅ More stable edge persistence (user-scoped data + computed edges)
-   ✅ Fewer sync race conditions
-   ✅ Automatic relationship discovery from content
-   ✅ Simpler error handling

### Knowledge Management Features

-   ✅ Natural content creation with [[wiki links]]
-   ✅ Automatic link discovery and graph building
-   ✅ Tag-based organization with #hashtags
-   ✅ Backlink discovery (what references this node?)
-   ✅ Content search across all nodes
-   ✅ Mixed explicit and computed relationships

### Code Simplification

-   ✅ Remove ~200 lines of room management code
-   ✅ Eliminate room-based state management
-   ✅ Simplify authentication flow
-   ✅ Reduce UI complexity
-   ✅ Single source of truth for relationships (content + explicit edges)

### Future Flexibility

-   ✅ Can add custom user system later if needed
-   ✅ Rich text editing capabilities
-   ✅ Content versioning possibilities
-   ✅ Advanced search and filtering
-   ✅ Better foundation for scaling
