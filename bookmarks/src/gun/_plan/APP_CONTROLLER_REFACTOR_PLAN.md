# AppController Refactor Plan

## Overview

This plan outlines the step-by-step refactor to move service logic into AppController handlers, breaking direct dependencies and establishing a clean event-driven architecture.

## Progress Summary

-   ✅ **COMPLETED**: Room operations (join, leave, export, import)
-   ✅ **COMPLETED**: Graph CRUD operations (nodeUpsert, nodeDelete, edgeUpsert, edgeDelete)
-   ✅ **COMPLETED**: Sync operations (select, subscribe, unsubscribe, refresh, pause/resume, room events)
-   ❌ **Phase 1 NOT STARTED**: Connection info gathering
-   ❌ **Phase 2 NOT STARTED**: Complex connection operations (auth, discovery, etc.)

**Overall Progress: ~75% Complete**

## Key Architecture Notes

### GunDBWrapper vs Direct Gun Usage

-   **AppController uses GunDBWrapper**: `this.gun = new GunDBWrapper()`
-   **Services currently use direct Gun**: `this.gun = Gun({...})`
-   **⚠️ CRITICAL**: When moving code from services to handlers, be very careful about GunDB API differences
-   **GunDBWrapper provides**: Clean interface, helper methods, data cleaning
-   **Direct Gun provides**: Raw GunDB API, requires manual data handling
-   **Migration strategy**: Test thoroughly when moving from direct Gun to GunDBWrapper

## Phase 1: Connection Info ❌ NOT STARTED

### Goal

Move connection info gathering to AppController handlers.

### Status: NOT STARTED

-   `handlersConnection.js` - `info` method ⚠️ STUBBED (TODO: Move from services/connection.js handleNetworkInfoRequest())

### Target Methods

-   `handlersConnection.js` - `info` method
-   **Why first**: Simple info gathering, no complex state management
-   **Complexity**: Medium - gather all network info and respond
-   **Dependencies**: Needs `appController.gun` (GunDBWrapper) for peer info

### Steps

1. Move connection info gathering logic to `handlersConnection.info()`
2. **⚠️ CRITICAL**: Test GunDBWrapper vs direct Gun API differences
3. Ensure all network info is properly gathered and formatted
4. Test network info display in ConnectionController
5. Remove service methods after confirmation

## Phase 2: Complex Operations ❌ NOT STARTED

### Goal

Move complex operations involving state management and async operations.

### Status: NOT STARTED

-   `handlersConnection.js` - `discovery` method ⚠️ STUBBED (TODO: Move from services/connection.js handleNetworkDiscovery())
-   `handlersConnection.js` - `connect` method ⚠️ STUBBED (TODO: Move from services/connection.js handleConnect())
-   `handlersConnection.js` - `disconnect` method ⚠️ STUBBED (TODO: Move from services/connection.js handleDisconnect())
-   `handlersConnection.js` - `test` method ⚠️ STUBBED (TODO: Move from services/connection.js handleTestConnection())
-   `handlersConnection.js` - `identityCreate` method ⚠️ STUBBED (TODO: Move from services/connection.js handleCreateIdentity())
-   `handlersConnection.js` - `login` method ⚠️ STUBBED (TODO: Move from services/connection.js handleLogin())

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

## Remaining Work

### Phase 1: Connection Info

-   Move connection info gathering from ConnectionService to handlersConnection.js
-   Test GunDBWrapper vs direct Gun API differences
-   Ensure all network info is properly gathered and formatted

### Phase 2: Complex Operations

-   Move all connection handlers from ConnectionService to handlersConnection.js
-   Test authentication, sync, and error handling thoroughly
-   Remove service methods after confirmation

## Success Criteria

-   All functionality works through AppController handlers
-   No direct service dependencies in controllers
-   Event-driven architecture established
-   Services can be deprecated/removed

## Current State

-   ✅ **COMPLETED**: All room operations (join, leave, export, import) moved to AppController handlers
-   ✅ **COMPLETED**: All graph CRUD operations (nodeUpsert, nodeDelete, edgeUpsert, edgeDelete) moved to AppController handlers
-   ✅ **COMPLETED**: All sync operations (select, subscribe, unsubscribe, refresh, pause/resume) moved to AppController handlers
-   ✅ **COMPLETED**: SyncService completely removed - all functionality migrated to handlersGraphRead.js
-   ❌ **Phase 1 NOT STARTED**: Connection info method is stubbed (TODO: Move from services/connection.js handleNetworkInfoRequest())
-   ❌ **Phase 2 NOT STARTED**: All connection handlers are stubbed (discovery, connect, disconnect, test, identityCreate, login)
-   ConnectionController uses event system (no direct service dependencies)
-   PropsService removed - functionality moved to RoomController/Room.js
-   SyncService removed - functionality moved to AppController handlers
-   Only ConnectionService remains active
-   GunDBWrapper is instantiated in AppController and actively used by all handlers

## Next Steps

1. **Begin Phase 1**: Move connection info gathering to handlersConnection.js
2. **Begin Phase 2**: Move complex connection operations to handlersConnection.js
3. **Final cleanup**: Remove ConnectionService after all functionality is migrated
