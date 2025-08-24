# Gun App Refactor: Phase 1 - Cleanup

## Current State Analysis

The current codebase has several architectural issues that need cleanup before the major refactor:

### **Problems to Solve**

1. **gunWrapper.js** (1150 lines) handles everything
2. **Multiple services** with overlapping responsibilities
3. **Complex event system** (DOM + custom + service events)
4. **Tight coupling** between services
5. **State management scattered** across services
6. **HTML hardcoded** in gun.html

## Phase 1: Cleanup Goals

### **1. Extract gunWrapper Methods**

-   **Current**: gunWrapper.js (1150 lines) handles everything
-   **Goal**: Thin utility library with focused methods
-   **Approach**: Extract methods by category (CRUD, auth, network, rooms)

### **2. Consolidate Services**

-   **Current**: auth, connection, graphOperations, room, sync, stateManager, eventCoordinator
-   **Goal**: Single ServiceController that handles all backend operations
-   **Approach**: Merge functionality, eliminate duplication

### **3. Simplify Event System**

-   **Current**: Multiple event systems mixed together
-   **Goal**: Single, direct event flow
-   **Approach**: Remove complex event coordination, use direct events

### **4. Clean Up State Management**

-   **Current**: State scattered across services
-   **Goal**: Controllers manage their own state
-   **Approach**: Remove StateManager, let controllers handle state

## Cleanup Steps

### **Step 1: Extract gunWrapper Methods**

```javascript
// Extract these method categories:
- CRUD operations (createNode, updateNode, deleteNode, etc.)
- Authentication (login, logout, createUser, etc.)
- Network (connect, disconnect, getPeers, etc.)
- Rooms (joinRoom, leaveRoom, getRooms, etc.)
- Graph operations (getGraph, addEdge, etc.)
```

### **Step 2: Create ServiceController Skeleton**

```javascript
// ServiceController.js - start with basic structure
class ServiceController {
	constructor(gunWrapper) {
		this.gunWrapper = gunWrapper;
	}

	// Basic CRUD methods
	// Basic auth methods
	// Basic network methods
}
```

### **Step 3: Test Basic Operations**

-   Test node creation/retrieval
-   Test basic authentication
-   Test network connection
-   Ensure gunWrapper methods work correctly

### **Step 4: Remove Old Services Gradually**

-   Start with least-used services
-   Move functionality to ServiceController
-   Test after each service removal
-   Keep working functionality until migration complete

## Success Criteria for Phase 1

-   ✅ **gunWrapper.js** is thin utility library (< 200 lines)
-   ✅ **ServiceController** handles all backend operations
-   ✅ **Single event system** (no complex coordination)
-   ✅ **No StateManager** (controllers manage own state)
-   ✅ **Basic functionality** still works (create/read nodes, auth, connection)
-   ✅ **Cleaner architecture** ready for Phase 2

## Phase 2: Migration to New Architecture

**After cleanup is complete**, migrate to:

-   **2-pane desktop layout** (FileTree | DocumentEditor/GraphView)
-   **Mobile view switching** via menu
-   **Document-centric** with auto-generated graph
-   **Responsive design** with CSS Grid/Flexbox
-   **New component structure** (FileTree, DocumentEditor, GraphView, Header, ConnectionDetails)

## Why This Order?

1. **Cleanup first** - remove architectural debt
2. **Test foundation** - ensure basic operations work
3. **Then migrate** - build new architecture on clean foundation
4. **Reduce risk** - smaller, testable changes

## Next Steps

1. **Start with gunWrapper extraction** - identify method categories
2. **Create ServiceController skeleton** - basic structure
3. **Test basic operations** - ensure foundation works
4. **Remove old services** - one at a time
5. **Prepare for Phase 2** - new architecture migration

This approach ensures the refactor goes smoothly by cleaning up the current mess before building the new system.
