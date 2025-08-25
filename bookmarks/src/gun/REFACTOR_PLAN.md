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

### **CRITICAL PRINCIPLE: Exact Replication First**

**Goal**: Reorganize current architecture while preserving exact functionality and appearance

**Why This Approach**:

-   ✅ **No functional changes** - just architectural reorganization
-   ✅ **Same user experience** - nothing breaks for users
-   ✅ **Better foundation** - current functionality gets organized for future improvements

### **1. Convert Components to DOM Creators**

-   **Current**: HTML is hardcoded in gun.html vs. JS-driven templates
-   **Goal**: Components create their own DOM dynamically and import their own CSS
-   **Approach**: Convert gun.html to shell, make components render themselves, co-locate CSS with components
-   **IMPORTANT**: Replicate current behavior exactly - no changes to functionality or appearance

### **2. Extract gunWrapper Methods**

-   **Current**: gunWrapper.js (1150 lines) handles everything
-   **Goal**: Thin utility library with focused methods
-   **Approach**: Extract methods by category (CRUD, auth, network, rooms)

### **3. Consolidate Services**

-   **Current**: auth, connection, graphOperations, room, sync, stateManager, eventCoordinator
-   **Goal**: Single ServiceController that handles all backend operations
-   **Approach**: Merge functionality, eliminate duplication

### **4. Simplify Event System**

-   **Current**: Multiple event systems mixed together
-   **Goal**: Single, direct event flow
-   **Approach**: Remove complex event coordination, use direct events

### **5. Clean Up State Management**

-   **Current**: State scattered across services
-   **Goal**: Controllers manage their own state
-   **Approach**: Remove StateManager, let controllers handle state

## Cleanup Steps

### **Step 1: Convert Components to DOM Creators**

-   Convert gun.html to shell with placeholder containers
-   Update components to create their own DOM
-   Extract component CSS to co-located files
-   Test component rendering with styles

### **Step 2: Extract gunWrapper Methods**

```javascript
// Extract these method categories:
- CRUD operations (createNode, updateNode, deleteNode, etc.)
- Authentication (login, logout, createUser, etc.)
- Network (connect, disconnect, getPeers, etc.)
- Rooms (joinRoom, leaveRoom, getRooms, etc.)
- Graph operations (getGraph, addEdge, etc.)
```

### **Step 3: Create ServiceController Skeleton**

```javascript
// Application/ServiceController.js - start with basic structure
class ServiceController {
	constructor(gunWrapper) {
		this.gunWrapper = gunWrapper;
	}

	// Basic CRUD methods
	// Basic auth methods
	// Basic network methods
}
```

### **Step 4: Test Basic Operations**

-   Test node creation/retrieval
-   Test basic authentication
-   Test network connection
-   Ensure gunWrapper methods work correctly

### **Step 5: Remove Old Services Gradually**

-   Start with least-used services
-   Move functionality to ServiceController
-   Test after each service removal
-   Keep working functionality until migration complete

## Success Criteria for Phase 1

-   ✅ **EXACT SAME FUNCTIONALITY** - no changes to user experience
-   ✅ **EXACT SAME APPEARANCE** - no visual changes
-   ✅ **Components create their own DOM** (no hardcoded HTML)
-   ✅ **Components import their own CSS** (co-located styles)
-   ✅ **gun.css is minimal** (global styles only)
-   ✅ **gunWrapper.js** is thin utility library (< 200 lines)
-   ✅ **ServiceController** handles all backend operations
-   ✅ **Single event system** (no complex coordination)
-   ✅ **No StateManager** (controllers manage own state)
-   ✅ **Basic functionality** still works (create/read nodes, auth, connection)
-   ✅ **Cleaner architecture** ready for Phase 2

## Target File Structure

### **Phase 1: Interim State (Exact Replication)**

```
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

### **Code Migration Map - Current → Phase 1 Structure**

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

1. **Start with interim structure** - convert to Header, Room, Activity, ConnectionDetails components
2. **Extract gunWrapper methods** - identify method categories
3. **Create ServiceController skeleton** - basic structure
4. **Test basic operations** - ensure foundation works
5. **Remove old services** - one at a time
6. **Prepare for Phase 2** - new architecture migration

This approach ensures the refactor goes smoothly by cleaning up the current mess before building the new system.
