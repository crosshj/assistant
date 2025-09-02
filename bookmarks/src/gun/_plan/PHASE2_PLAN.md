# Gun App Refactor: Phase 2 - gunWrapper and Services Refactoring

## Overview

**Phase 2 Goal**: Break down the monolithic gunWrapper.js (1150 lines) into focused, maintainable service classes while preserving all functionality.

**Why This Phase**: gunWrapper.js has grown to 30+ methods with mixed responsibilities, making it difficult to maintain, test, and extend.

**Current Status**: Phase 1 (Controller Architecture) is complete. Ready to start Phase 2 refactoring.

## Current State Analysis

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

## Phase 2 Strategy

### **Step 0: Create ApplicationController Architecture (CURRENT PRIORITY)**

**Goal**: Establish single point of GunDB access through event-driven ApplicationController

**Current Problem**:

-   Multiple gunWrapper instances across controllers
-   Direct GunDB access scattered throughout codebase
-   Mixed responsibilities between layout and GunDB operations
-   gunWrapper.js is 1150 lines with mixed responsibilities

**Solution**: ApplicationController as single GunDB access point

**Architecture**:

```
gun.js → ApplicationController → gunWrapper (SINGLE INSTANCE)
Controllers → Events → ApplicationController → gunWrapper
```

**Implementation**:

```javascript
// ApplicationController - single GunDB access point
class ApplicationController {
	constructor(connection) {
		this.gunWrapper = new GunDBWrapper(connection); // SINGLE INSTANCE
		this.setupGunDBEventListeners();
	}

	setupGunDBEventListeners() {
		// All GunDB operations go through events
		addEventListener('gun:getNode', async (event) => {
			const { room, nodeId } = event.detail;
			const node = await this.gunWrapper.getNode(room, nodeId);
			dispatchEvent('gun:getNodeResponse', { node, room, nodeId });
		});

		addEventListener('gun:upsertNode', async (event) => {
			const { room, nodeData } = event.detail;
			const result = await this.gunWrapper.upsertNode(room, nodeData);
			dispatchEvent('gun:upsertNodeResponse', { result, room, nodeData });
		});

		// ... all other GunDB operations
	}
}

// Controllers use events instead of direct gunWrapper access
class RoomController {
	async getNode(room, nodeId) {
		// Fire event, wait for response
		dispatchEvent('gun:getNode', { room, nodeId });
		return new Promise((resolve) => {
			addEventListener(
				'gun:getNodeResponse',
				(event) => {
					if (event.detail.nodeId === nodeId) {
						resolve(event.detail.node);
					}
				},
				{ once: true }
			);
		});
	}
}
```

**Benefits**:

-   Single GunDB instance
-   Centralized GunDB operations
-   Event-driven architecture
-   Easier gunWrapper refactoring
-   Controllers don't need GunDB knowledge

### **Step 1: Clean Up gunWrapper Methods (SAFE)**

**Goal**: Remove debug/test methods and extract utilities from 1150-line file

**Cleanup Order** (by priority):

1. **Remove debug/test methods** (immediate cleanup):

    ```javascript
    // REMOVE these methods entirely
    -testIsolatedInstance() -
    	debugNodeData() -
    	testIsolatedPropsFetch() -
    	getPropsFromMemory() -
    	getPropsFromVisualization() -
    	getPropsCarefully() -
    	getPropsFallback() -
    	cleanupIsolatedInstance();
    ```

2. **Extract pure utility methods** (no dependencies):

    ```javascript
    // Move to _lib/utils.js
    -cleanNodeData() -
    	cleanEdgeData() -
    	extractCleanProps() -
    	isGunDBMetadata() -
    	textToId() -
    	generateId();
    ```

3. **Keep core methods** (essential functionality):

    ```javascript
    // Keep in gunWrapper.js (will be moved to ServiceController later)
    -getNode() -
    	getEdge() -
    	upsertNode() -
    	upsertEdge() -
    	getNodeProps() -
    	getEdgeProps() -
    	getPropsIsolated() -
    	runNetworkDiscovery() -
    	queryPeerEndpoints() -
    	queryGunCatalogs();
    ```

**Action**: Start with removing debug methods, then extract utilities

### **Step 2: Create ServiceController (SAFE)**

**Goal**: Single controller for all backend operations, consolidating existing services

**Structure**:

```javascript
// controllers/ServiceController.js
class ServiceController {
	constructor(connection) {
		this.connection = connection;
		this.gunWrapper = new GunDBWrapper(connection); // Single instance
		this.currentRoom = null;
		this.currentUser = null;
	}

	// CRUD operations (from gunWrapper)
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

	// Auth operations (from AuthManager)
	async createUser(alias, password) {
		// Move logic from AuthManager
	}
	async loginUser(alias, password) {
		// Move logic from AuthManager
	}
	async logoutUser() {
		// Move logic from AuthManager
	}

	// Room operations (from RoomManager)
	async joinRoom(roomName) {
		// Move logic from RoomManager
	}
	async leaveRoom() {
		// Move logic from RoomManager
	}

	// Network operations (from connection service)
	async connect(peers) {
		// Move logic from connection service
	}
	async disconnect() {
		// Move logic from connection service
	}
}
```

**Action**: Create file, implement basic structure, start with CRUD operations

### **Step 3: Test Basic Operations (CRITICAL)**

**Goal**: Ensure gunWrapper methods work before moving anything

**Test Cases**:

1. **Node creation**: Create a test node, verify it exists
2. **Node retrieval**: Get the test node, verify data integrity
3. **Basic auth**: Create user, login, verify authentication
4. **Room join**: Join a room, verify room state
5. **Network connection**: Verify peer connections work

**Action**: Write simple test functions, run them in browser console

### **Step 4: Gradual Service Migration (RISKY)**

**Goal**: Move functionality one service at a time

**Migration Order** (least risky to most risky):

1. **Create ApplicationController** → Single GunDB access point via events
2. **Move GunDB operations** → From services to ApplicationController
3. **Update controllers** → Use events instead of direct gunWrapper access
4. **Consolidate services** → Move remaining service logic to ApplicationController
5. **StateManager** → Already removed in Phase 1 (controllers manage own state)
6. **EventCoordinator** → Already removed in Phase 1 (direct event handling)
7. **PropsManager** → Already removed in Phase 1 (moved to controllers)

**Action**: Move one service at a time, test after each move

### **Step 5: Final Cleanup (SAFE)**

**Goal**: Remove old service files and clean up gunWrapper.js

**Cleanup Actions**:

1. **Remove old service files**:

    - `services/auth.js` (moved to ServiceController)
    - `services/room.js` (moved to ServiceController)
    - `services/graphOperations.js` (moved to ServiceController)
    - `services/sync.js` (moved to ServiceController)

2. **Simplify gunWrapper.js**:

    - Keep only essential GunDB wrapper methods
    - Remove all debug/test methods
    - Target: <200 lines total

3. **Update imports**:
    - Update all controllers to use ServiceController
    - Remove old service imports
    - Update gun.js to use ApplicationController

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

### **Test 1: gunWrapper Methods**

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

### **Phase 2 Complete When**:

-   ✅ **gunWrapper.js** < 200 lines (utility methods only)
-   ✅ **ServiceController** handles all CRUD operations
-   ✅ **Basic functionality** works (create/read nodes, auth, connection)
-   ✅ **No complex event coordination**
-   ✅ **Controllers manage own state**

### **Ready for Phase 3 When**:

-   ✅ **Clean architecture** with single ServiceController
-   ✅ **Simple event flow** between controllers
-   ✅ **No StateManager** dependency (completed in Phase 1)
-   ✅ **No EventCoordinator** dependency (completed in Phase 1)
-   ✅ **No PropsManager** dependency (completed in Phase 1)
-   ✅ **All tests pass**

## Next Action

**Start with Step 0**: Create ApplicationController as single GunDB access point via events. This is the foundation for all other refactoring.

**Immediate Priority**:

1. Create ApplicationController with event-driven GunDB access
2. Remove debug/test methods from gunWrapper.js
3. Extract utility methods to \_lib/utils.js
4. Test that all functionality still works

**Success Metrics**:

-   gunWrapper.js reduced from 1150 lines to <200 lines
-   Single GunDB instance through ApplicationController
-   All controllers use events instead of direct gunWrapper access
-   All existing functionality preserved

This detailed plan provides the specific steps needed to safely refactor the gunWrapper and services without breaking functionality.
