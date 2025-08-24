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

### **Step 1: Extract gunWrapper Methods (SAFE)**

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

### **Step 2: Create ServiceController Skeleton (SAFE)**

**Goal**: Single controller for all backend operations

**Structure**:

```javascript
// controllers/ServiceController.js
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

### **Phase 1 Complete When**:

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

**Start with Step 1**: Analyze gunWrapper.js methods and categorize them by dependency level. Don't move anything yet - just understand what exists and what depends on what.

This detailed plan provides the specific steps needed to safely refactor the codebase without breaking functionality.
