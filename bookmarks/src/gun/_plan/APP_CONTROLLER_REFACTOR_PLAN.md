# AppController Refactor Plan

## Overview

This plan outlines the step-by-step refactor to move service logic into AppController handlers, breaking direct dependencies and establishing a clean event-driven architecture.

## Key Architecture Notes

### GunDBWrapper vs Direct Gun Usage

-   **AppController uses GunDBWrapper**: `this.gun = new GunDBWrapper()`
-   **Services currently use direct Gun**: `this.gun = Gun({...})`
-   **⚠️ CRITICAL**: When moving code from services to handlers, be very careful about GunDB API differences
-   **GunDBWrapper provides**: Clean interface, helper methods, data cleaning
-   **Direct Gun provides**: Raw GunDB API, requires manual data handling
-   **Migration strategy**: Test thoroughly when moving from direct Gun to GunDBWrapper

## Phase 1: Room Graph Operations

### Goal

Move simple room operations to AppController handlers.

### Target Methods

-   `handlersRoom.js` - `export` and `import` methods
-   **Why first**: Simple, self-contained, minimal dependencies
-   **Complexity**: Low - just data operations
-   **Dependencies**: Only needs `appController.gun` (GunDBWrapper)

### Steps

1. Move `exportRoom()` logic to `handlersRoom.export()`
2. Move `importRoomData()` logic to `handlersRoom.import()`
3. Test room export/import functionality
4. Remove service methods after confirmation

## Phase 2: Graph Operations

### Goal

Move graph CRUD operations to AppController handlers.

### Target Methods

-   `handlersGraph.js` - `nodeUpsert`, `nodeDelete`, `edgeUpsert`, `edgeDelete`
-   **Why second**: Straightforward CRUD operations
-   **Complexity**: Low-Medium - basic GunDB operations
-   **Dependencies**: Only needs `appController.gun` (GunDBWrapper)

### Steps

1. Move `upsertNode()` logic to `handlersGraph.nodeUpsert()`
2. Move `deleteNode()` logic to `handlersGraph.nodeDelete()`
3. Move `upsertEdge()` logic to `handlersGraph.edgeUpsert()`
4. Move `deleteEdge()` logic to `handlersGraph.edgeDelete()`
5. Test all graph operations
6. Remove service methods after confirmation

## Phase 3: Connection Info

### Goal

Move connection info gathering to AppController handlers.

### Target Methods

-   `handlersConnection.js` - `info` method
-   **Why third**: Now just needs to respond to single `network:infoRequest` event
-   **Complexity**: Medium - gather all network info and respond
-   **Dependencies**: Needs `appController.gun` (GunDBWrapper) for peer info

### Steps

1. Move connection info gathering logic to `handlersConnection.info()`
2. **⚠️ CRITICAL**: Test GunDBWrapper vs direct Gun API differences
3. Ensure all network info is properly gathered and formatted
4. Test network info display in ConnectionController
5. Remove service methods after confirmation

## Phase 4: Complex Operations

### Goal

Move complex operations involving state management and async operations.

### Target Methods

-   Connection auth: `handlersConnection.login`, `handlersConnection.identityCreate`
-   **Why last**: Most complex, involves state management and async operations
-   **Complexity**: High - authentication, sync, error handling
-   **Dependencies**: Multiple services, state management

### Steps

1. Move authentication logic to connection handlers
2. **⚠️ CRITICAL**: Test GunDBWrapper vs direct Gun API differences
3. Test all complex operations thoroughly
4. Remove service methods after confirmation

## Testing Strategy

### For Each Phase

1. **Move one method at a time**
2. **Test functionality after each move**
3. **Keep services running in parallel during transition**
4. **Remove service code only after confirming handler works**
5. **⚠️ Pay special attention to GunDBWrapper vs direct Gun API differences**

### Success Criteria

-   All functionality works through AppController handlers
-   No direct service dependencies in controllers
-   Event-driven architecture established
-   Services can be deprecated/removed

## Risk Mitigation

### GunDBWrapper vs Direct Gun

-   **Risk**: API differences between GunDBWrapper and direct Gun usage
-   **Mitigation**: Test each method thoroughly when moving from service to handler
-   **Documentation**: Note any API differences discovered during migration

### Event Flow Changes

-   **Risk**: Breaking existing event flows
-   **Mitigation**: Maintain backward compatibility during transition
-   **Testing**: Verify all event listeners still work correctly

## Current State

-   AppController is stubbed with handlers
-   ConnectionController uses event system (no direct service dependencies)
-   PropsService removed - functionality moved to RoomController/Room.js and SyncService
-   Services are still active and handling events
-   GunDBWrapper is instantiated in AppController but not yet used

## Next Steps

1. **Begin Phase 1: Room operations**
