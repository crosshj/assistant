# Gun App Refactor: Detailed Action Plan

> **Note**: Phase 2 details have been moved to a separate document: [`PHASE2_PLAN.md`](./PHASE2_PLAN.md)

## Current Architecture Analysis

### **Completed: Initial Cleanup Phase**

✅ **Components are now DOM creators** - each component creates its own HTML
✅ **File structure reorganized** - component-based folders instead of `components/` folder  
✅ **Fresh visualization approach** - Cytoscape starts fresh for each room
✅ **Console cleaned up** - removed verbose logging
✅ **Force-directed layout** as default

### **✅ COMPLETED: Phase 1 - Controller Architecture Implementation**

#### **RoomController (COMPLETED):**

✅ **RoomController Created** - Centralized all room-related event wiring  
✅ **Event-Driven Architecture** - All external communication now goes through events  
✅ **Clean Separation** - Room component is now pure UI, RoomController handles coordination  
✅ **Direct Dependencies Eliminated** - gun.js no longer directly accesses Room component  
✅ **Enhanced Edge Handling** - Improved edge direction management and form clearing  
✅ **Form State Management** - Smart form clearing based on selection state

#### **HeaderController (COMPLETED):**

✅ **HeaderController Created** - Centralized all header-related event wiring  
✅ **Event-Driven Architecture** - Listens to connection service events, coordinates UI updates  
✅ **Clean Separation** - Header component is now pure UI, HeaderController handles coordination  
✅ **Optimistic UI Updates** - Connect button immediately shows "Connecting..." state  
✅ **Event Coordination** - Emits events for room pane visibility management  
✅ **Service Integration** - Coordinates between Header UI and connection/auth services

#### **ActivityController (COMPLETED):**

✅ **ActivityController Created** - Centralized all activity-related event wiring  
✅ **Event-Driven Architecture** - Listens to generic `activity:log` events from any service  
✅ **Clean Separation** - Activity component is now pure UI, ActivityController handles coordination  
✅ **Event Delegation Pattern** - All UI events bound via delegation on component DOM  
✅ **No Service Dependencies** - Follows preferred pattern of listening to DOM events only  
✅ **Pure UI Component** - Activity component has zero controller knowledge or event binding

**Critical Controller Design Principles (ESTABLISHED):**

-   ✅ **Controllers are event wiring hubs** - Connect DOM events to service calls
-   ✅ **Minimal business logic** - Controllers coordinate, don't implement complex logic
-   ✅ **Tight coupling with component** - Controller owns component instance (`this.room`, `this.header`)
-   ✅ **External events → Controller → Component** via CustomEvents
-   ✅ **User events → Component → Controller** via direct method calls
-   ✅ **Controller → Services** via service method calls (intermediate step)
-   ✅ **Future goal**: Controller → Services via DOM events (when architecture allows)

**Architecture Achieved:**

-   **Before**: `gun.js` → direct component access → tight coupling
-   **After**: `gun.js` → events → RoomController → events → Room component

**Dependencies Eliminated:**

-   ❌ `this.room.visualization` direct access
-   ❌ `this.room.updateNodeForm()` direct calls
-   ❌ `this.room.updateEdgeForm()` direct calls
-   ❌ Sync service direct visualization manipulation

### **Current Architecture Issues to Address**

#### **Event Logic Scattered Throughout Services**

-   **EventCoordinator**: Handles room join/leave, data sync coordination
-   **StateManager**: Manages network, room, auth state changes
-   **PropsManager**: Handles props loading and selection events
-   **Components**: Still contain some event handling and business logic

#### **Service Responsibilities Mixed**

-   **Services handle both data operations and event coordination**
-   **Components handle both UI rendering and business logic**
-   **Event flow is complex**: UI → Component → Service → EventCoordinator → StateManager

#### **gunWrapper.js (1150 lines) - Future Refactoring Target**

-   **Class**: `GunDBWrapper` with 30+ methods
-   **Dependencies**: Requires `connection` object in constructor
-   **Methods by category**:
    -   **CRUD**: `getNode`, `getEdge`, `upsertNode`, `upsertEdge`
    -   **Props**: `getNodeProps`, `getEdgeProps`, `getPropsIsolated`
    -   **Network**: `runNetworkDiscovery`, `queryPeerEndpoints`, `queryGunCatalogs`
    -   **Debug**: `testIsolatedInstance`, `debugNodeData`, `testIsolatedPropsFetch`
    -   **Utility**: `cleanNodeData`, `cleanEdgeData`

## Phase 1: Controller Architecture Strategy

### **CRITICAL PRINCIPLE: Separation of Concerns**

**Goal**: Move event logic and business logic out of UI components into dedicated controllers

**Why This Approach**:

-   ✅ **Clean separation** - UI components only render, controllers handle logic
-   ✅ **Better testability** - controllers can be unit tested independently
-   ✅ **Easier maintenance** - event handling centralized in one place per component
-   ✅ **Reusable logic** - controllers can work with different UI components
-   ✅ **Foundation for gunWrapper refactoring** - clean architecture makes complex refactoring easier

### **Step 1: Create Controller Architecture (CRITICAL)**

**Goal**: Establish clean separation between UI components and business logic

**Current Problem**:

-   **Components handle rendering, events, and business logic**
-   **Services handle both data operations and event coordination**
-   **Event flow is scattered** across multiple layers
-   **gunWrapper refactoring** will be difficult without clean architecture

**Target State**:

-   **Components are pure UI renderers** (no business logic)
-   **Controllers handle all events and business logic**
-   **Services focus on data operations only**
-   **Event handling centralized** in component controllers
-   **Clean separation of concerns** between UI and logic
    **Implementation**:

1. **Create Controller Structure**:

    ```javascript
    // File structure for controller architecture
    src/gun/
    ├── Header/
    │   ├── Header.js (UI rendering only)
    │   ├── Header.css
    │   └── HeaderController.js (event handling + business logic)
    ├── Room/
    │   ├── Room.js (UI rendering only)
    │   ├── Room.css
    │   └── RoomController.js (event handling + business logic)
    ├── Activity/
    │   ├── Activity.js (UI rendering only)
    │   ├── Activity.css
    │   └── ActivityController.js (event handling + business logic)
    ├── ConnectionDetails/
    │   ├── ConnectionDetails.js (UI rendering only)
    │   ├── ConnectionDetails.css
    │   └── ConnectionDetailsController.js (event handling + business logic)
    └── services/ (keep existing services for now)
        ├── auth.js
        ├── connection.js
        ├── eventCoordinator.js
        ├── graphOperations.js
        ├── PropsManager.js
        ├── room.js
        ├── stateManager.js
        └── sync.js
    ```

2. **Extract Event Handlers from Components**:

    ```javascript
    // Before: Component handles both UI and events
    class Room {
    	constructor() {
    		this.bindEvents();
    	}

    	bindEvents() {
    		document.addEventListener('ui:joinRoom', (event) => {
    			this.currentRoom = event.detail.room;
    			this.setMode('room-mode');
    		});
    	}
    }

    // After: Component only renders, controller handles events
    class Room {
    	constructor(controller) {
    		this.controller = controller;
    		this.render();
    	}

    	render() {
    		// Only UI rendering logic
    	}
    }

    class RoomController {
    	constructor(roomService, syncService, visualizationService) {
    		this.roomService = roomService;
    		this.syncService = syncService;
    		this.visualizationService = visualizationService;
    		this.bindEvents();
    	}

    	bindEvents() {
    		document.addEventListener('ui:joinRoom', (event) => {
    			this.handleJoinRoom(event.detail.room);
    		});
    	}

    	handleJoinRoom(roomName) {
    		// Coordinate between services
    		this.roomService.joinRoom(roomName);
    		this.syncService.subscribeToRoom(roomName);
    		this.visualizationService.initializeForRoom(roomName);
    	}
    }
    ```

3. **Move Event Logic Out of Services**:

    **EventCoordinator → RoomController**:

    - Room join/leave coordination
    - Data sync initiation
    - State change handling

    **StateManager → Component Controllers**:

    - Network state changes → HeaderController
    - Room state changes → RoomController
    - Auth state changes → HeaderController

    **PropsManager → RoomController**:

    - Props loading logic
    - Selection change handling
    - Props request coordination

4. **Establish Controller-Service Communication**:

    ```javascript
    // Controllers coordinate between services
    class RoomController {
    	constructor(
    		roomService,
    		syncService,
    		visualizationService,
    		propsService
    	) {
    		this.roomService = roomService;
    		this.syncService = syncService;
    		this.visualizationService = visualizationService;
    		this.propsService = propsService;
    	}

    	handleJoinRoom(roomName) {
    		// Coordinate multiple services
    		this.roomService.joinRoom(roomName);
    		this.syncService.subscribeToRoom(roomName);
    		this.visualizationService.initializeForRoom(roomName);
    	}

    	handleNodeSelection(elementId, elementType) {
    		// Load props for selected element
    		this.propsService.loadProps(
    			elementId,
    			elementType,
    			this.currentRoom
    		);
    	}
    }
    ```

### **Step 2: Test Controller Integration (CRITICAL)**

**Goal**: Ensure all existing functionality works through the controller layer

**Testing Strategy**:

1. **Functional regression testing** - every current feature works exactly the same
2. **Event flow testing** - verify events flow: UI → Component → Controller → Service
3. **Service communication testing** - ensure controllers coordinate services correctly
4. **Performance testing** - no performance regression from controller layer

**Test Cases**:

1. **Room operations**:

    - Join room → RoomController → roomService + syncService + visualizationService
    - Leave room → RoomController → cleanup coordination
    - Room state changes → RoomController → UI updates

2. **Graph operations**:

    - Node selection → RoomController → propsService
    - Layout changes → RoomController → visualizationService
    - CRUD operations → RoomController → appropriate services

3. **Network operations**:
    - Connection changes → HeaderController → connectionService
    - Peer updates → ConnectionDetailsController → connectionService

**Action**: Test each component's functionality through its controller before moving to next component

### **Step 3: Prepare for gunWrapper Refactoring (FUTURE)**

**Goal**: Once controllers are stable, begin the complex gunWrapper refactoring

**Why Controllers First**:

-   ✅ **Clean architecture** makes complex refactoring much easier
-   ✅ **Event flow is simplified** through controller layer
-   ✅ **Services are focused** on data operations only
-   ✅ **Testing is easier** with clear separation of concerns

**gunWrapper Refactoring Strategy** (for future):

1. **Extract method categories**:

    - CRUD operations (createNode, updateNode, deleteNode, etc.)
    - Authentication (login, logout, createUser, etc.)
    - Network (connect, disconnect, getPeers, etc.)
    - Rooms (joinRoom, leaveRoom, getRooms, etc.)
    - Graph operations (getGraph, addEdge, etc.)

2. **Create focused service classes**:

    - `CRUDService` - handle node/edge operations
    - `AuthService` - handle user authentication
    - `NetworkService` - handle peer connections
    - `RoomService` - handle room operations

3. **Update controllers** to use new service structure

**Action**: Focus on controller architecture first, gunWrapper refactoring comes later

### **Step 4: Future Architecture Planning (DOCUMENTATION)**

**Goal**: Document the future document-centric architecture for Phase 2

**Phase 2: Document-Centric Architecture**:

1. **2-pane desktop layout**: FileTree | DocumentEditor/GraphView
2. **Mobile view switching**: via menu
3. **Document-centric**: with auto-generated graph
4. **Responsive design**: with CSS Grid/Flexbox
5. **New component structure**: FileTree, DocumentEditor, GraphView, Header, ConnectionDetails

**Why This Order**:

1. **Controller architecture first** - establish clean separation of concerns
2. **gunWrapper refactoring second** - break down complex service into focused classes
3. **Document-centric migration third** - change user experience and layout
4. **Reduce risk** - smaller, testable changes with no user-facing impact

**Action**: Document future plans, but focus on controller implementation first

### **Step 5: Controller Implementation Order (SAFE)**

**Goal**: Implement controllers one component at a time

**Implementation Order** (most complex to simplest):

1. **RoomController** - handles visualization, room state, graph operations
2. **HeaderController** - handles network, auth, room selection
3. **ActivityController** - handles activity log updates
4. **ConnectionDetailsController** - handles peer connection events

**Why This Order**:

-   **RoomController first** - most complex with visualization logic
-   **HeaderController second** - network and auth coordination
-   **ActivityController third** - simpler log management
-   **ConnectionDetailsController last** - peer-specific events

**Action**: Implement one controller at a time, test thoroughly before moving to next

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
-   ✅ **Components are pure UI renderers** (no business logic)
-   ✅ **Controllers handle all events and business logic**
-   ✅ **Services focus on data operations only**
-   ✅ **Event handling centralized** in component controllers
-   ✅ **Clean separation of concerns** between UI and logic
-   ✅ **All existing functionality works** through controller layer
-   ✅ **Architecture ready for gunWrapper refactoring**

### **Ready for gunWrapper Refactoring When**:

-   ✅ **Controller architecture is stable** and tested
-   ✅ **Event flow is simplified** through controller layer
-   ✅ **Services are focused** on data operations only
-   ✅ **Testing is easier** with clear separation of concerns

### **Ready for Phase 2 (Document-Centric) When**:

-   ✅ **gunWrapper is refactored** into focused service classes
-   ✅ **Controller-service communication** is clean and stable
-   ✅ **All current functionality** works with new architecture
-   ✅ **Foundation is solid** for major UI/UX changes

## Next Action

### **CRITICAL: Complete Before Controllers**

**Fix Network Disconnection State**:

-   When disconnecting from network, room pane should go into blank state
-   Clear visualization and show appropriate "disconnected" message
-   Prevent room operations when disconnected

**Fix Connection Details Modal Buttons**:

-   Refresh button should trigger network discovery
-   Network discovery button should work when clicked from modal
-   Ensure proper event handling for these buttons

### **Then Start with Step 1**: Create the RoomController

**Why RoomController First**:

-   **Most complex component** - handles visualization, room state, graph operations
-   **Establishes the pattern** - other controllers can follow the same structure
-   **High impact** - room operations are core to the application
-   **Good test case** - complex enough to validate the controller architecture

**Implementation Steps**:

1. ✅ Create `RoomController.js` in the `Room/` folder
2. ✅ Move event listeners from `Room.js` to `RoomController`
3. ✅ Move business logic methods to `RoomController`
4. ✅ Update `Room.js` to call controller methods
5. ✅ Test that room join/leave, visualization, and graph operations work identically
6. ✅ Verify event flow: UI → Component → Controller → Service

**Next Implementation Steps**:

7. **HeaderController** - Create `HeaderController.js` and move header event logic
8. ✅ **ActivityController (COMPLETED)** - Create `ActivityController.js` and move activity log logic
9. **ConnectionDetailsController** - Create `ConnectionDetailsController.js` and move connection events
10. **Test Integration** - Ensure all controllers work together seamlessly
11. **Prepare for gunWrapper Refactoring** - Once all controllers are stable

---

## **Phase 2: gunWrapper and Services Refactoring**

### **gunWrapper.js Analysis (1150 lines) - Core Issues**

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

### **Phase 2 Strategy: Extract gunWrapper Methods (SAFE)**

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

### **Create ServiceController Skeleton (SAFE)**

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

### **Event System Simplification**

**Current Event Flow**:

```
UI Event → EventCoordinator → Service → StateManager → DOM Event → UI Update
```

**New Event Flow**:

```
UI Event → Controller → ServiceController → Direct UI Update
```

**Implementation**:

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

### **Testing Strategy**

**Test 1: gunWrapper Methods**

```javascript
// Test in browser console
const wrapper = new GunDBWrapper(connection);
const node = await wrapper.getNode('public', 'test-node');
console.log('Node retrieved:', node);
```

**Test 2: ServiceController CRUD**

```javascript
// Test in browser console
const service = new ServiceController(wrapper);
const result = await service.createNode('public', { label: 'Test', props: {} });
console.log('Node created:', result);
```

### **Rollback Plan**

**If gunWrapper breaks**:

-   Revert to previous version
-   Test individual methods to identify issue
-   Fix method in place before continuing

**If ServiceController breaks**:

-   Comment out broken methods
-   Keep old services running
-   Fix one method at a time

**If events break**:

-   Revert to old event system
-   Identify which events are critical
-   Fix event handling before continuing

### **Phase 2 Success Criteria**

-   ✅ **gunWrapper.js** < 200 lines (utility methods only)
-   ✅ **ServiceController** handles all CRUD operations
-   ✅ **Basic functionality** works (create/read nodes, auth, connection)
-   ✅ **No complex event coordination**
-   ✅ **Controllers manage own state**
-   ✅ **Clean architecture** with single ServiceController
-   ✅ **Simple event flow** between controllers
-   ✅ **No StateManager** dependency
-   ✅ **All tests pass**

This detailed plan provides the specific steps needed to safely implement the controller architecture without breaking functionality.
