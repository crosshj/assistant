# Gun App Refactor: Detailed Action Plan

## Current Architecture Analysis

### **gunWrapper.js (1150 lines) - Core Issues**

-   **Class**: `GunDBWrapper` with 30+ methods
-   **Dependencies**: Requires `connection` object in constructor
-   **Methods by category**:
    -   **CRUD**: `getNode`, `getEdge`, `upsertNode`, `upsertEdge`
    -   **Props**: `getNodeProps`, `getEdgeProps`, `getPropsIsolated`
    -   **Network**: `runNetworkDiscovery`, `queryPeerEndpoints`, `queryGunCatalogs`
    -   **Debug**: `testIsolatedInstance`, `debugNodeData`, `testIsolatedPropsFetch`
    -   **Utility**: `cleanNodeData`, `cleanEdgeData`

### **Service Dependencies (Critical Path)**

```
gun.js (main app)
├── StateManager (manages network, room, auth state)
├── EventCoordinator (coordinates all services)
├── GunConnection (manages GunDB instance and peers)
├── AuthManager (handles user authentication)
├── RoomManager (manages room operations)
├── GraphOperations (handles node/edge CRUD)
├── DataSync (manages data synchronization)
└── GunDBWrapper (wraps GunDB operations)
```

### **Event Flow Complexity**

-   **DOM events**: `ui:connect`, `ui:disconnect`, `ui:joinRoom`
-   **Custom events**: `graph:requestProps`, `graph:propsLoaded`
-   **Service events**: `connectionStatusChanged`, `roomStatusChanged`
-   **State events**: `stateChanged` broadcast to DOM

## Phase 1: Cleanup Strategy

### **CRITICAL PRINCIPLE: Exact Replication First**

**Goal**: Reorganize current architecture while preserving exact functionality and appearance

**Why This Approach**:

-   ✅ **No functional changes** - just architectural reorganization
-   ✅ **Same user experience** - nothing breaks for users
-   ✅ **Incremental testing** - verify each step works exactly like before
-   ✅ **Easy rollback** - if something goes wrong, revert to current state
-   ✅ **Better foundation** - current functionality gets organized for future improvements

### **Step 1: Convert Components to DOM Creators (CRITICAL)**

**Goal**: Make components create their own DOM and CSS instead of manipulating hardcoded HTML

**Current Problem**:

-   **gun.html** has hardcoded DOM structure
-   **Components** just manipulate existing DOM elements
-   **Layout is fixed** in HTML, not dynamic
-   **gun.css** (724 lines) contains all styles for all components
-   **CSS is centralized** and hard to maintain

**Target State**:

-   **gun.html** is just a shell with placeholder containers
-   **Components create their own DOM** dynamically
-   **Components import their own CSS** (self-contained)
-   **Layout is flexible** and component-driven
-   **gun.css** is minimal (global styles only)

**IMPORTANT**: Replicate current behavior exactly - no changes to functionality or appearance

**Implementation**:

1. **Convert gun.html to shell**:

    ```html
    <!-- Before: Hardcoded UI -->
    <section
    	class="card edit-panel"
    	id="editPanel"
    >
    	<header><h3>Edit</h3></header>
    	<div class="body">
    		<!-- hardcoded form elements -->
    	</div>
    </section>

    <!-- After: Just containers -->
    <div id="app-container">
    	<div id="left-pane"></div>
    	<div id="center-pane"></div>
    	<div id="right-pane"></div>
    </div>
    ```

2. **Update components to create DOM and import CSS**:

    ```javascript
    // Before: Component manipulates existing DOM
    class GraphForms {
    	updateNodeForm(data) {
    		document.getElementById('nodeLabel').value = data.label;
    	}
    }

    // After: Component creates its own DOM and imports its own CSS
    import './DocumentEditor.css';

    class DocumentEditor {
    	constructor(container) {
    		this.container = container;
    		this.render();
    	}

    	render() {
    		this.container.innerHTML = `
          <div class="document-editor">
            <header><h3>Document Editor</h3></header>
            <div class="editor-content">
              <textarea id="doc-content"></textarea>
            </div>
          </div>
        `;
    	}
    }
    ```

3. **Organize CSS co-location** - move component styles to component files

    ```javascript
    // File structure after CSS reorganization (INTERIM STATE)
    src/gun/
    ├── lib/
    │   ├── gunWrapper.js
    │   ├── cytoscapeWrapper.js
    │   └── utils.js
    ├── Header/
    │   ├── Header.js (Network, Room, Identity controls)
    │   ├── Header.css
    │   └── HeaderController.js
    ├── Room/
    │   ├── Room.js (handles both Room List and Room Mode)
    │   ├── Room.css
    │   └── RoomController.js
    ├── Activity/
    │   ├── Activity.js (activity log)
    │   ├── Activity.css
    │   └── ActivityController.js
    ├── ConnectionDetails/
    │   ├── ConnectionDetails.js (renamed from PeerModal - connection status modal)
    │   ├── ConnectionDetails.css
    │   └── ConnectionDetailsController.js
    ├── gun.js
    └── gun.css (global styles only)
    ```

    **Code Migration Map - Current → Phase 1 Structure**

    #### **Header/**

    ```
    components/header/Header.js → Header/Header.js
    gun.css (header styles) → Header/Header.css
    ```

    #### **Room/**

    ```
    components/RoomList.js → Room/Room.js
    components/forms/GraphForms.js → Room/Room.js
    components/graph/GraphView.js → Room/Room.js
    components/visualization/visualization.js → Room/Room.js
    gun.css (room, edit-panel, graph-panel styles) → Room/Room.css
    ```

    #### **Activity/**

    ```
    components/sidebar/Sidebar.js → Activity/Activity.js
    gun.css (activity panel styles) → Activity/Activity.css
    ```

    #### **ConnectionDetails/**

    ```
    components/PeerModal.js → ConnectionDetails/ConnectionDetails.js
    gun.css (modal styles) → ConnectionDetails/ConnectionDetails.css
    ```

    #### **lib/**

    ```
    services/gunWrapper.js → lib/gunWrapper.js
    components/visualization/visualization.js → lib/cytoscapeWrapper.js
    utils/utils.js → lib/utils.js
    ```

    #### **Removed**

    ```
    components/PropsManager.js (functionality moves to Room component)
    gun.css (becomes global styles only)
    ```

    **Result**: 4 self-contained components, each with JS + CSS + Controller, plus utility libraries in lib/.

4. **Test DOM creation and CSS** - ensure components render with their own styles

**Interim State Benefits**:

-   ✅ **Matches current layout exactly** - Header, Room (List/Detail), Activity, ConnectionDetails
-   ✅ **Components are self-contained** - own their DOM, CSS, and logic
-   ✅ **Simple architecture** - only 4 main components to manage
-   ✅ **Foundation for future** - easy to change layout later

**Future Migration** (Phase 2):

-   **Change to 2-pane layout**: FileTree | DocumentEditor/GraphView
-   **Document-centric architecture**: replace graph-centric approach
-   **Mobile view switching**: responsive design with view switching
-   **New components**: FileTree, DocumentEditor, GraphView, ConnectionDetails

**Benefits**:

-   ✅ **Components are truly self-contained** - they own their DOM, CSS, and state
-   ✅ **Layout is flexible** - components can be moved, resized, hidden
-   ✅ **Better separation of concerns** - UI logic and styles live with UI components
-   ✅ **Easier testing** - components can render in isolation with their styles
-   ✅ **More maintainable** - no hardcoded HTML or centralized CSS
-   ✅ **Better organization** - find styles where you find component code
-   ✅ **Modular architecture** - components can be moved/reused independently

**Action**: Start with one component (e.g., DocumentEditor), convert it to create its own DOM, extract its CSS to a co-located file, test rendering with styles, then move to next component

### **Step 2: Extract gunWrapper Methods (SAFE)**

**Goal**: Break down 1150-line file into focused utility methods

**Extraction Order** (by dependency level):

1. **Pure utility methods** (no dependencies):

    ```javascript
    // Move to lib/utils.js
    -cleanNodeData() - cleanEdgeData() - generateId();
    ```

2. **Basic CRUD methods** (minimal dependencies):

    ```javascript
    // Keep in gunWrapper.js initially
    -getNode(room, nodeId) -
    	getEdge(room, edgeId) -
    	upsertNode(room, nodeData) -
    	upsertEdge(room, edgeData);
    ```

3. **Props methods** (depend on CRUD):

    ```javascript
    // Keep in gunWrapper.js initially
    -getNodeProps(room, nodeId) -
    	getEdgeProps(room, edgeId) -
    	getPropsIsolated(room, elementType, elementId);
    ```

4. **Network methods** (depend on connection):
    ```javascript
    // Keep in gunWrapper.js initially
    -runNetworkDiscovery() - queryPeerEndpoints() - queryGunCatalogs();
    ```

**Action**: Create method categories, don't move anything yet

### **Step 3: Create ServiceController Skeleton (SAFE)**

**Goal**: Single controller for all backend operations

**Structure**:

```javascript
// Application/ServiceController.js
class ServiceController {
	constructor(gunWrapper) {
		this.gunWrapper = gunWrapper;
		this.currentRoom = null;
		this.currentUser = null;
	}

	// CRUD operations
	async createNode(room, nodeData) {
		/* call gunWrapper.upsertNode */
	}
	async getNode(room, nodeId) {
		/* call gunWrapper.getNode */
	}
	async updateNode(room, nodeId, nodeData) {
		/* call gunWrapper.upsertNode */
	}
	async deleteNode(room, nodeId) {
		/* call gunWrapper method */
	}

	// Auth operations
	async createUser(alias, password) {
		/* implement auth logic */
	}
	async loginUser(alias, password) {
		/* implement auth logic */
	}
	async logoutUser() {
		/* implement auth logic */
	}

	// Room operations
	async joinRoom(roomName) {
		/* implement room logic */
	}
	async leaveRoom() {
		/* implement room logic */
	}

	// Network operations
	async connect(peers) {
		/* implement connection logic */
	}
	async disconnect() {
		/* implement disconnection logic */
	}
}
```

**Action**: Create file, implement basic structure, don't wire up yet

### **Step 4: Test Basic Operations (CRITICAL)**

**Goal**: Ensure gunWrapper methods work before moving anything

**Test Cases**:

1. **Node creation**: Create a test node, verify it exists
2. **Node retrieval**: Get the test node, verify data integrity
3. **Basic auth**: Create user, login, verify authentication
4. **Room join**: Join a room, verify room state
5. **Network connection**: Verify peer connections work

**Action**: Write simple test functions, run them in browser console

### **Step 5: Gradual Service Migration (RISKY)**

**Goal**: Move functionality one service at a time

**Migration Order** (least risky to most risky):

1. **GraphOperations** → ServiceController (CRUD operations)
2. **AuthManager** → ServiceController (authentication)
3. **RoomManager** → ServiceController (room operations)
4. **GunConnection** → ServiceController (network operations)
5. **DataSync** → ServiceController (sync operations)
6. **StateManager** → Remove (controllers manage own state)
7. **EventCoordinator** → Remove (direct event handling)

**Action**: Move one service at a time, test after each move

## Implementation Details

### **gunWrapper Method Categories**

#### **Category 1: Core CRUD (KEEP)**

```javascript
// These stay in gunWrapper.js
-getNode(room, nodeId) -
	getEdge(room, edgeId) -
	upsertNode(room, nodeData) -
	upsertEdge(room, edgeData) -
	deleteNode(room, nodeId) - // needs to be added
	deleteEdge(room, edgeId); // needs to be added
```

#### **Category 2: Props Management (KEEP)**

```javascript
// These stay in gunWrapper.js
-getNodeProps(room, nodeId) -
	getEdgeProps(room, edgeId) -
	getPropsIsolated(room, elementType, elementId);
```

#### **Category 3: Network Operations (KEEP)**

```javascript
// These stay in gunWrapper.js
-runNetworkDiscovery() -
	queryPeerEndpoints() -
	queryGunCatalogs() -
	queryActiveRooms() -
	queryUsers();
```

#### **Category 4: Debug/Test (REMOVE)**

```javascript
// These can be removed or moved to dev tools
-testIsolatedInstance() -
	debugNodeData() -
	testIsolatedPropsFetch() -
	getPropsFromMemory() -
	getPropsFromVisualization();
```

### **ServiceController Implementation**

#### **Phase 1: Basic CRUD**

```javascript
class ServiceController {
	constructor(gunWrapper) {
		this.gunWrapper = gunWrapper;
		this.currentRoom = null;
	}

	// Basic CRUD - call gunWrapper methods
	async createNode(room, nodeData) {
		return await this.gunWrapper.upsertNode(room, nodeData);
	}

	async getNode(room, nodeId) {
		return await this.gunWrapper.getNode(room, nodeId);
	}

	async updateNode(room, nodeId, nodeData) {
		return await this.gunWrapper.upsertNode(room, {
			...nodeData,
			id: nodeId,
		});
	}

	async deleteNode(room, nodeId) {
		// Implement delete logic
		return await this.gunWrapper.deleteNode(room, nodeId);
	}
}
```

#### **Phase 2: Add Auth**

```javascript
class ServiceController {
	// ... existing code ...

	constructor(gunWrapper, connection) {
		this.gunWrapper = gunWrapper;
		this.connection = connection;
		this.currentRoom = null;
		this.currentUser = null;
	}

	async createUser(alias, password) {
		// Move logic from AuthManager
		return new Promise((resolve, reject) => {
			this.connection.user.create(alias, password, (ack) => {
				if (ack.err) reject(ack.err);
				else resolve(alias);
			});
		});
	}

	async loginUser(alias, password) {
		// Move logic from AuthManager
		return new Promise((resolve, reject) => {
			this.connection.user.auth(alias, password, ({ err }) => {
				if (err) reject(err);
				else {
					this.currentUser = alias;
					resolve(alias);
				}
			});
		});
	}
}
```

#### **Phase 3: Add Room Management**

```javascript
class ServiceController {
	// ... existing code ...

	async joinRoom(roomName) {
		// Move logic from RoomManager
		this.currentRoom = roomName;
		this.graphRoot = this.connection.gun.get('graphs').get(roomName);
		return true;
	}

	async leaveRoom() {
		// Move logic from RoomManager
		this.currentRoom = null;
		this.graphRoot = null;
		return true;
	}
}
```

### **Event System Simplification**

#### **Current Event Flow**:

```
UI Event → EventCoordinator → Service → StateManager → DOM Event → UI Update
```

#### **New Event Flow**:

```
UI Event → Controller → ServiceController → Direct UI Update
```

#### **Implementation**:

```javascript
// Remove complex event coordination
// Use direct method calls and simple events

// Before (complex):
document.addEventListener('ui:createNode', (e) => {
	this.eventCoordinator.handleCreateNode(e.detail);
});

// After (simple):
document.addEventListener('ui:createNode', async (e) => {
	const result = await this.serviceController.createNode(room, e.detail);
	if (result) {
		// Update UI directly
		this.updateNodeDisplay(result);
	}
});
```

## Testing Strategy

### **CRITICAL: Exact Replication Testing**

**Goal**: Ensure refactored code behaves exactly like current code

**Testing Approach**:

1. **Functional regression testing** - every current feature works exactly the same
2. **Visual regression testing** - exact same appearance and layout
3. **Interaction testing** - all current user interactions work identically
4. **Performance testing** - no performance regression

**Test 1: gunWrapper Methods**

```javascript
// Test in browser console
const wrapper = new GunDBWrapper(connection);
const node = await wrapper.getNode('public', 'test-node');
console.log('Node retrieved:', node);
```

### **Test 2: ServiceController CRUD**

```javascript
// Test in browser console
const service = new ServiceController(wrapper);
const result = await service.createNode('public', { label: 'Test', props: {} });
console.log('Node created:', result);
```

### **Test 3: Event Flow**

```javascript
// Test in browser console
document.dispatchEvent(
	new CustomEvent('ui:createNode', {
		detail: { label: 'Test', props: {} },
	})
);
```

## Rollback Plan

### **CRITICAL: Maintain Exact Functionality**

**If anything breaks or behaves differently from current state**:

-   **Immediate rollback** - revert to previous working version
-   **Identify the difference** - what changed from current behavior
-   **Fix the replication** - ensure exact same functionality
-   **Test thoroughly** - verify behavior matches current state exactly

### **If gunWrapper breaks**:

-   Revert to previous version
-   Test individual methods to identify issue
-   Fix method in place before continuing

### **If ServiceController breaks**:

-   Comment out broken methods
-   Keep old services running
-   Fix one method at a time

### **If events break**:

-   Revert to old event system
-   Identify which events are critical
-   Fix event handling before continuing

## Success Criteria

### **Phase 1 Complete When**:

-   ✅ **EXACT SAME FUNCTIONALITY** - no changes to user experience
-   ✅ **EXACT SAME APPEARANCE** - no visual changes
-   ✅ **Components create their own DOM** (no hardcoded HTML)
-   ✅ **Components import their own CSS** (co-located styles)
-   ✅ **gun.css is minimal** (global styles only)
-   ✅ **Interim file structure** implemented (Header, Room, Activity)
-   ✅ **gunWrapper.js** < 200 lines (utility methods only)
-   ✅ **ServiceController** handles all CRUD operations
-   ✅ **Basic functionality** works (create/read nodes, auth, connection)
-   ✅ **No complex event coordination**
-   ✅ **Controllers manage own state**

### **Ready for Phase 2 When**:

-   ✅ **Clean architecture** with single ServiceController
-   ✅ **Simple event flow** between controllers
-   ✅ **No StateManager** dependency
-   ✅ **All tests pass**

## Next Action

**Start with Step 1**: Convert components to create their own DOM and CSS. Start with one component (e.g., DocumentEditor), convert it to create its own DOM, extract its CSS to a co-located file, test rendering with styles, then move to next component. This is the foundation for the entire refactor.

This detailed plan provides the specific steps needed to safely refactor the codebase without breaking functionality.
