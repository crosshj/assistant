# Gun App Refactor: Phase 1 - Controller Architecture

## Current State Analysis

We have successfully completed the initial cleanup phase:

✅ **Components are now DOM creators** - each component creates its own HTML
✅ **File structure reorganized** - component-based folders instead of `components/` folder  
✅ **Fresh visualization approach** - Cytoscape starts fresh for each room
✅ **Console cleaned up** - removed verbose logging
✅ **Force-directed layout** as default

## Phase 1: Controller Architecture Goals

### **CRITICAL PRINCIPLE: Separation of Concerns**

**Goal**: Move event logic and business logic out of UI components into dedicated controllers

**Why This Approach**:

-   ✅ **Clean separation** - UI components only render, controllers handle logic
-   ✅ **Better testability** - controllers can be unit tested independently
-   ✅ **Easier maintenance** - event handling centralized in one place per component
-   ✅ **Reusable logic** - controllers can work with different UI components

### **1. Create Controllers for Each Component**

-   **Current**: Event handlers and business logic scattered throughout components and services
-   **Goal**: Each component has a dedicated controller handling all its logic
-   **Approach**: Extract event handlers, business logic, and service calls into controllers

### **2. Move Event Logic Out of Services**

-   **Current**: Services handle both data operations and event coordination
-   **Goal**: Services focus on data operations, controllers handle events
-   **Approach**: Move event handling from EventCoordinator, StateManager, etc. into component controllers

### **3. Simplify Component Responsibilities**

-   **Current**: Components handle rendering, events, and business logic
-   **Goal**: Components become pure UI renderers
-   **Approach**: Components call controller methods, controllers handle all external communication

### **4. Centralize Event Handling**

-   **Current**: Events handled in multiple places (components, services, main app)
-   **Goal**: Single event handling location per component
-   **Approach**: Controllers listen for events and coordinate with services

## Implementation Steps

### **Step 1: Create Controller Structure**

Create the basic controller pattern for each component:

```
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
```

### **Step 2: Extract Event Handlers from Components**

-   Move all event listeners from components to controllers
-   Move business logic methods to controllers
-   Components become pure renderers that call controller methods
-   Test that functionality remains identical

### **Step 3: Move Event Logic Out of Services**

-   **EventCoordinator**: Move room join/leave logic to RoomController
-   **StateManager**: Move state change handling to appropriate controllers
-   **Sync service**: Keep data operations, move event coordination to controllers
-   **PropsManager**: Move props loading logic to controllers

### **Step 4: Establish Controller-Service Communication**

```javascript
// Controllers coordinate with services
class RoomController {
	constructor(roomService, syncService, visualizationService) {
		this.roomService = roomService;
		this.syncService = syncService;
		this.visualizationService = visualizationService;
	}

	handleJoinRoom(roomName) {
		// Coordinate between services
		this.roomService.joinRoom(roomName);
		this.syncService.subscribeToRoom(roomName);
		this.visualizationService.initializeForRoom(roomName);
	}
}
```

### **Step 5: Test Controller Integration**

-   Verify all existing functionality works through controllers
-   Test event flow: UI → Component → Controller → Service
-   Ensure no regression in user experience

## Success Criteria for Phase 1

-   ✅ **EXACT SAME FUNCTIONALITY** - no changes to user experience
-   ✅ **EXACT SAME APPEARANCE** - no visual changes
-   ✅ **Components are pure UI renderers** (no business logic)
-   ✅ **Controllers handle all events and business logic**
-   ✅ **Services focus on data operations only**
-   ✅ **Event handling centralized** in component controllers
-   ✅ **Clean separation of concerns** between UI and logic
-   ✅ **All existing functionality works** through controller layer
-   ✅ **Architecture ready for gunWrapper refactoring**

## Target File Structure

### **Phase 1: Controller Architecture (Current Target)**

```
src/gun/
├── lib/
│   ├── gunWrapper.js (keep as-is for now)
│   ├── cytoscapeWrapper.js
│   └── utils.js
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
├── services/ (keep existing services for now)
│   ├── auth.js
│   ├── connection.js
│   ├── eventCoordinator.js
│   ├── graphOperations.js
│   ├── PropsManager.js
│   ├── room.js
│   ├── stateManager.js
│   └── sync.js
├── gun.js
└── gun.css (global styles only)
```

### **Controller Responsibilities**

#### **HeaderController**

-   Network connection/disconnection events
-   Room selection events
-   Authentication state management
-   Header visibility logic

#### **RoomController**

-   Room join/leave events
-   Visualization initialization/destruction
-   Node/edge CRUD events
-   Layout change events
-   Room state management

#### **ActivityController**

-   Activity log updates
-   Log clearing/copying
-   Activity state management

#### **ConnectionDetailsController**

-   Peer connection events
-   Network status updates
-   Connection testing events

### **Phase 2: Future Architecture (Document-Centric)**

```
src/gun/
├── lib/
├── Application/
├── FileTree/
├── DocumentEditor/
├── GraphView/
├── Header/
└── ConnectionDetails/
```

## Phase 2: Migration to New Architecture

**After Phase 1 is complete and working**, migrate to new architecture:

-   **2-pane desktop layout** (FileTree | DocumentEditor/GraphView)
-   **Mobile view switching** via menu
-   **Document-centric** with auto-generated graph
-   **Responsive design** with CSS Grid/Flexbox
-   **New component structure** (FileTree, DocumentEditor, GraphView, Header, ConnectionDetails)

**Note**: Phase 2 is about changing the user experience and layout. Phase 1 is about reorganizing the current functionality without changing how it works or looks.

## Why This Order?

1. **Exact replication first** - reorganize without changing functionality
2. **Cleanup second** - remove architectural debt while maintaining behavior
3. **Test foundation** - ensure basic operations work exactly the same
4. **Then migrate** - build new architecture on clean foundation
5. **Reduce risk** - smaller, testable changes with no user-facing impact

## Testing Approach

**CRITICAL: Exact Replication Testing**

-   **Functional regression testing** - every current feature works exactly the same
-   **Visual regression testing** - exact same appearance and layout
-   **Interaction testing** - all current user interactions work identically
-   **Performance testing** - no performance regression

## Next Steps

### **CRITICAL: Complete Before Controllers**

1. **Fix Network Disconnection State**:

    - When disconnecting from network, room pane should go into blank state
    - Clear visualization and show appropriate "disconnected" message
    - Prevent room operations when disconnected

2. **Fix Connection Details Modal Buttons**:
    - Refresh button should trigger network discovery
    - Network discovery button should work when clicked from modal
    - Ensure proper event handling for these buttons

### **Then Implement Controller Architecture**:

3. **Start with RoomController** - extract event handling and business logic from Room.js
4. **Create HeaderController** - move header event logic from Header.js
5. **Create ActivityController** - move activity log logic from Activity.js
6. **Create ConnectionDetailsController** - move connection event logic
7. **Test controller integration** - ensure all functionality works through controllers
8. **Prepare for gunWrapper refactoring** - once controllers are stable

## **✅ PHASE 1 COMPLETED: RoomController Implementation**

**What Was Accomplished:**

-   ✅ **RoomController Created** - Centralized all room-related business logic
-   ✅ **Event-Driven Architecture** - All communication now goes through events
-   ✅ **Clean Separation** - Room component is now pure UI, RoomController handles logic
-   ✅ **Direct Dependencies Eliminated** - gun.js no longer directly accesses Room component
-   ✅ **Enhanced Edge Handling** - Improved edge direction management and form clearing
-   ✅ **Form State Management** - Smart form clearing based on selection state

**New Event Flow (IMPLEMENTED):**

```
gun.js → CustomEvent → RoomController → CustomEvent → Room component
```

**Architecture Changes (COMPLETED):**

-   **Before**: `gun.js` → direct component access → tight coupling
-   **After**: `gun.js` → events → RoomController → events → Room component

**Dependencies Eliminated:**

-   ❌ `this.room.visualization` direct access
-   ❌ `this.room.updateNodeForm()` direct calls
-   ❌ `this.room.updateEdgeForm()` direct calls
-   ❌ Sync service direct visualization manipulation

**Next Phase:**

-   **HeaderController** - extract event handling and business logic from Header.js
-   **ActivityController** - move activity log logic from Activity.js
-   **ConnectionDetailsController** - move connection event logic
-   **Test controller integration** - ensure all functionality works through controllers
-   **Prepare for gunWrapper refactoring** - once all controllers are stable

This approach ensures the refactor goes smoothly by establishing clean separation of concerns before tackling the complex gunWrapper refactoring.
