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

-   **Event logic scattered** throughout services and components
-   **Service responsibilities mixed** - data operations + event coordination
-   **Complex event flow** - UI → Component → Service → EventCoordinator → StateManager
-   **gunWrapper.js** - 1150 lines with mixed responsibilities

**Solution**: Create dedicated controllers for each major UI component

**Implementation Order** (most complex to simplest):

1. **RoomController** - handles visualization, room state, graph operations
2. **HeaderController** - handles network, auth, room selection
3. **ActivityController** - handles activity log updates
4. **ConnectionController** - handles peer connection events

**Why This Order**:

-   **RoomController first** - most complex with visualization logic
-   **HeaderController second** - network and auth coordination
-   **ActivityController third** - simpler log management
-   **ConnectionController last** - peer-specific events

**Action**: Implement one controller at a time, test thoroughly before moving to next

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

**Next Phase:**

-   ✅ **RoomController (COMPLETED)** - extract event handling and business logic from Room.js
-   ✅ **HeaderController (COMPLETED)** - move header event logic from Header.js
-   ✅ **ActivityController (COMPLETED)** - extract event handling and business logic from Activity.js
-   **ConnectionController** - move connection event logic from Connection.js
-   **Eliminate StateManager** - controllers manage their own state instead of centralized state
-   **Eliminate EventCoordinator** - controllers listen to events directly from services
-   **Eliminate PropsManager** - move props handling logic to RoomController/UI components
-   **Simplify gun.js** - remove dependency injection and setConnection calls
-   **Prepare for ApplicationController** - ensure controllers can work with event-driven GunDB access
-   **Test controller integration** - ensure all functionality works through controllers

## **Current Status: Ready for Phase 2**

**Phase 1 is complete** with solid controller architecture established. The foundation is ready for the next phase of refactoring.

**Immediate Next Steps:**

1. **Create ApplicationController** - Single GunDB access point via events
2. **Break down gunWrapper.js** - Remove debug methods, extract utilities
3. **Consolidate services** - Move to single ServiceController
4. **Test and validate** - Ensure all functionality works through new architecture

---

## **Phase 2: gunWrapper and Services Refactoring**

**See separate document**: [`PHASE2_PLAN.md`](./PHASE2_PLAN.md)

**Overview**: Break down the monolithic gunWrapper.js (1150 lines) into focused, maintainable service classes while preserving all functionality.

**Key Goals**:

-   Extract gunWrapper methods by dependency level
-   Create ServiceController for all backend operations
-   Simplify event system (remove EventCoordinator/StateManager)
-   Maintain exact functionality during refactoring

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

### **Phase 2: gunWrapper and Services Refactoring (CURRENT FOCUS)**

**Status**: Phase 1 complete, ready to start Phase 2

**Immediate Actions**:

1. **Create ApplicationController** - Single GunDB access point via events

    - Centralize all GunDB operations through event-driven architecture
    - Controllers use events instead of direct gunWrapper access
    - Foundation for gunWrapper refactoring

2. **Break down gunWrapper.js** (1150 lines → <200 lines):

    - **Remove**: Debug/test methods (testIsolatedInstance, debugNodeData, etc.)
    - **Extract**: Pure utility methods to \_lib/utils.js
    - **Keep**: Core CRUD, Props Management, Network Operations

3. **Consolidate Services** - Move to single ServiceController:

    - CRUD operations
    - Auth operations
    - Room management
    - Network operations

4. **Test and Validate** - Ensure all functionality works through new architecture

### **Future: Phase 3 - App-Scoped Migration**

**After Phase 2 is stable**:

-   Remove room-based architecture
-   Implement links-as-nodes approach with [[wiki links]]
-   Separate namespaces: `gun.user().get('nodes')` and `gun.user().get('edges')`
-   Content-based relationship discovery

This approach ensures the refactor goes smoothly by establishing clean separation of concerns before tackling the complex gunWrapper refactoring.
