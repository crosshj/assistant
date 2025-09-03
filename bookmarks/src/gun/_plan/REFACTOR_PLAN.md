# Gun App Refactor: Action Plan

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

### **Current Architecture (Simplified)**

```
gun.js (main app)
├── AppController (manages Gun instances and coordinates operations)
├── handlersConnection.js (handles connection logic)
├── RoomController (handles room operations)
├── HeaderController (handles header operations)
├── ActivityController (handles activity log)
└── GunDBWrapper (wraps GunDB operations)
```

### **Event Flow (Simplified)**

-   **DOM events**: `ui:connect`, `ui:disconnect`, `ui:joinRoom`
-   **Custom events**: `graph:requestProps`, `graph:propsLoaded`
-   **App events**: `app:init`, `network:infoRequest`
-   **Direct controller communication** via events

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

-   **gunWrapper.js** - 1150 lines with mixed responsibilities
-   **Debug/test methods** cluttering the codebase
-   **Utility methods** mixed with core functionality

**Solution**: Clean up gunWrapper.js by removing debug methods and extracting utilities

**Implementation Order**:

1. **Remove debug/test methods** - Clean up the codebase
2. **Extract utility methods** - Move to `_lib/utils.js`
3. **Test functionality** - Ensure everything still works

**Action**: Start with removing debug methods, then extract utilities

## **✅ PHASE 1 COMPLETED: Controller Architecture Implementation**

### **RoomController (COMPLETED):**

-   ✅ **RoomController Created** - Centralized all room-related event wiring
-   ✅ **Event-Driven Architecture** - All external communication now goes through events
-   ✅ **Clean Separation** - Room component is now pure UI, RoomController handles coordination
-   ✅ **Direct Dependencies Eliminated** - gun.js no longer directly accesses Room component
-   ✅ **Enhanced Edge Handling** - Improved edge direction management and form clearing
-   ✅ **Form State Management** - Smart form clearing based on selection state

### **HeaderController (COMPLETED):**

-   ✅ **HeaderController Created** - Centralized all header-related event wiring
-   ✅ **Event-Driven Architecture** - Listens to connection service events, coordinates UI updates
-   ✅ **Clean Separation** - Header component is now pure UI, HeaderController handles coordination
-   ✅ **Optimistic UI Updates** - Connect button immediately shows "Connecting..." state
-   ✅ **Event Coordination** - Emits events for room pane visibility management
-   ✅ **Service Integration** - Coordinates between Header UI and connection/auth services

### **ActivityController (COMPLETED):**

-   ✅ **ActivityController Created** - Centralized all activity-related event wiring
-   ✅ **Event-Driven Architecture** - Listens to generic `activity:log` events from any service
-   ✅ **Clean Separation** - Activity component is now pure UI, ActivityController handles coordination
-   ✅ **Event Delegation Pattern** - All UI events bound via delegation on component DOM
-   ✅ **No Service Dependencies** - Follows preferred pattern of listening to DOM events only
-   ✅ **Pure UI Component** - Activity component has zero controller knowledge or event binding

### **✅ COMPLETED: AppController Architecture**

-   ✅ **AppController Created** - Single point of GunDB access through event-driven architecture
-   ✅ **ConnectionService Eliminated** - All connection logic moved to `handlersConnection.js`
-   ✅ **Single GunDB Instance** - AppController owns `rawGun` and `gunDBWrapper` instances
-   ✅ **Event-Driven GunDB Access** - All GunDB operations go through events
-   ✅ **Clean Separation** - AppController coordinates, handlersConnection manages connection logic

**Critical Controller Design Principles (ESTABLISHED):**

-   ✅ **Controllers are event wiring hubs** - Connect DOM events to service calls
-   ✅ **Minimal business logic** - Controllers coordinate, don't implement complex logic
-   ✅ **Tight coupling with component** - Controller owns component instance (`this.room`, `this.header`)
-   ✅ **External events → Controller → Component** via CustomEvents
-   ✅ **User events → Component → Controller** via direct method calls
-   ✅ **Controller → Services** via service method calls (intermediate step)
-   ✅ **Future goal**: Controller → Services via DOM events (when architecture allows)

**New Event Flow (IMPLEMENTED):**

```
gun.js → CustomEvent → RoomController → Direct calls → Room component
User → Room component → Direct calls → RoomController → Service calls → Services
```

**Architecture Changes (COMPLETED):**

-   **Before**: `gun.js` → direct component access → tight coupling
-   **After**: `gun.js` → events → RoomController → events → Room component

**Dependencies Eliminated:**

-   ❌ `this.room.visualization` direct access
-   ❌ `this.room.updateNodeForm()` direct calls
-   ❌ `this.room.updateEdgeForm()` direct calls
-   ❌ Sync service direct visualization manipulation
-   ❌ ConnectionService dependency
-   ❌ Multiple GunDB instances
-   ❌ StateManager dependency
-   ❌ EventCoordinator dependency
-   ❌ PropsManager dependency

## **Current Status: Ready for Phase 2**

**Phase 1 is complete** with solid controller architecture and AppController established. The foundation is ready for the next phase of refactoring.

**Immediate Next Steps:**

1. **Break down gunWrapper.js** - Remove debug methods, extract utilities
2. **Test and validate** - Ensure all functionality works after cleanup

---

## **Phase 2: gunWrapper Cleanup**

**See separate document**: [`PHASE2_PLAN.md`](./PHASE2_PLAN.md)

**Overview**: Clean up the monolithic gunWrapper.js (1150 lines) by removing debug methods and extracting utilities.

**Key Goals**:

-   Remove debug/test methods from gunWrapper.js
-   Extract utility methods to `_lib/utils.js`
-   Reduce gunWrapper.js from 1150 lines to <200 lines
-   Maintain exact functionality during cleanup

---

## **Phase 3: Future Architecture (Document-Centric)**

### **Target Architecture**

**After Phase 2 is complete and working**, migrate to new architecture:

```
src/gun/
├── _lib/
├── Application/
├── FileTree/
├── DocumentEditor/
├── GraphView/
├── Header/
└── Connection/
```

**Key Changes**:

1. **2-pane desktop layout**: FileTree | DocumentEditor/GraphView
2. **Mobile view switching** via menu
3. **Document-centric data model** instead of graph-centric
4. **App-scoped authentication** instead of user-scoped
5. **Links-as-nodes approach** for content relationships

**Note**: Phase 3 is about changing the user experience and layout. Phase 1 is about reorganizing the current functionality without changing how it works or looks.

## Why This Order?

1. **Controller architecture first** - establish clean separation of concerns
2. **gunWrapper cleanup second** - remove debug methods and extract utilities
3. **Test foundation** - ensure basic operations work exactly the same
4. **Then migrate** - build new architecture on clean foundation
5. **Reduce risk** - smaller, testable changes with no user-facing impact

## Testing Approach

**CRITICAL: Exact Replication Testing**

-   **Functional regression testing** - every current feature works exactly the same
-   **Visual regression testing** - exact same appearance and layout
-   **Interaction testing** - all current user interactions work identically
-   **Performance testing** - no performance regression

## **PRIORITY: Prevent Duplicate Operations**

**CRITICAL ISSUE**: The current system shows duplicate operations in activity logs:

```
[17:49:04.829] ✅ Unsubscribed from room data
[17:49:04.830] ✅ Subscribed to room data
[17:49:04.830] 🔄 Setting up data handlers for room data sync
[17:49:04.836] 🗑️ Node ee2dcd99... received null data - removing from graph
[17:49:04.836] 🗑️ Node eec47a85... received null data - removing from graph
[17:49:04.837] 🗑️ Edge 1dc29527... received null data - removing from graph
[17:49:04.837] 🗑️ Edge 881dcfae... received null data - removing from graph
[17:49:04.837] 📊 Edge synced: 8bb830ea... (39b90a74... → 5ef017ea...) [unnamed]
[17:49:04.838] 📊 Edge synced: b5172566... (39b90a74... → 5ef017ea...) [unnamed]
[17:49:04.838] 📊 Edge synced: d662eb67... (5ef017ea... → 39b90a74...) [unnamed]
[17:49:04.840] ✅ Data handlers set up successfully
[17:49:07.391] ✅ Unsubscribed from room data  ← DUPLICATE
[17:49:07.392] ✅ Subscribed to room data      ← DUPLICATE
[17:49:07.392] 🔄 Setting up data handlers...  ← DUPLICATE
[17:49:07.398] 🗑️ Node ee2dcd99... received... ← DUPLICATE
[17:49:07.399] 🗑️ Node eec47a85... received... ← DUPLICATE
[17:49:07.399] 🗑️ Edge 1dc29527... received... ← DUPLICATE
[17:49:07.399] 🗑️ Edge 881dcfae... received... ← DUPLICATE
[17:49:07.400] 📊 Edge synced: 8bb830ea...     ← DUPLICATE
[17:49:07.400] 📊 Edge synced: b5172566...     ← DUPLICATE
[17:49:07.401] 📊 Edge synced: d662eb67...     ← DUPLICATE
[17:49:07.402] ✅ Data handlers set up...      ← DUPLICATE
```

**Root Cause**: Multiple event listeners or handlers are triggering the same data sync operations.

**Priority Actions**:

1. **Audit event listeners** - Ensure room data sync only happens once per room change
2. **Add operation deduplication** - Prevent duplicate subscriptions/unsubscriptions
3. **Implement state tracking** - Track if data handlers are already set up for a room
4. **Add operation guards** - Check if operation is already in progress before starting

**Success Criteria**:

-   ✅ Each room change triggers data sync operations exactly once
-   ✅ No duplicate subscriptions/unsubscriptions in activity log
-   ✅ No duplicate node/edge sync operations
-   ✅ Clean, non-repetitive activity logs

## Next Steps

### **Phase 2: gunWrapper Cleanup (CURRENT FOCUS)**

**Status**: Phase 1 complete, ready to start Phase 2

**Immediate Actions**:

1. **Remove debug/test methods** from gunWrapper.js:

    - Remove testIsolatedInstance, debugNodeData, testIsolatedPropsFetch, etc.
    - Clean up the codebase by removing development-only code

2. **Extract utility methods** to \_lib/utils.js:

    - Move cleanNodeData, cleanEdgeData, extractCleanProps, etc.
    - Keep gunWrapper.js focused on core GunDB operations

3. **Test and Validate** - Ensure all functionality works after cleanup:

    - Test node creation/retrieval
    - Test auth functionality
    - Test room operations
    - Test network connections

### **Future: Phase 3 - Document-Centric Migration**

**After Phase 2 is stable**:

-   Remove room-based architecture
-   Implement links-as-nodes approach with [[wiki links]]
-   Separate namespaces: `gun.user().get('nodes')` and `gun.user().get('edges')`
-   Content-based relationship discovery

This approach ensures the refactor goes smoothly by establishing clean separation of concerns before tackling the complex gunWrapper cleanup.
