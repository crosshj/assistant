# Phase 3: Future Architecture (Document-Centric)

> **⚠️ VERY IMPORTANT**: This phase must follow the architectural principles defined in `ARCHITECTURE.md`. Review that document first before implementing any changes.

## Overview

**Phase 3 Goal**: Migrate to a document-centric architecture with app-scoped data model and unified UI components.

**Current Status**: Ready to begin Phase 3 implementation.

## Target Architecture

**Migrate to new architecture:**

```
src/gun/
├── _lib/
├── Activity/
├── App/
├── Connection/
├── DocumentEditor/         # 🆕 NEW - rich text editing with markdown
├── FileTree/               # 🆕 NEW - document/file navigation component
├── GraphView/              # 🔄 RENAMED - Room (existing functionality)
├── Header/
└── Layout/
```

## Key Changes

1. **2-pane desktop layout**: FileTree | DocumentEditor/GraphView
2. **Mobile view switching** via menu
3. **Document-centric data model** instead of graph-centric
4. **App-scoped authentication** instead of user-scoped
5. **Links-as-nodes approach** for content relationships

## Related Planning Documents

This phase builds upon the architectural foundations established in:

-   **`GUN_STREAM_THROTTLING.md`** - Query-level filtering and app-scoped migration approach
-   **`GUN_MIGRATION_TO_APP_SCOPED.md`** - Detailed migration strategy for app-scoped architecture
-   **`GUN_NETWORK_DISCOVERY.md`** - Network discovery and peer management

## Implementation Strategy

### Phase 3A: Visual Layout Migration

**Goal**: Introduce new document-centric visual layout

**New Component Structure**:

-   **FileTree**: Document/file navigation
-   **DocumentEditor**: Rich text editing with markdown support
-   **GraphView**: Visual representation of document relationships (renamed from room pane)
-   **ActivityLog**: Toggleable pane for system logs (like VS Code terminal)
-   **Header**: Network status and user controls
-   **Connection**: Peer connection management

**Layout Changes**:

-   **Desktop**: 2-pane layout (FileTree | DocumentEditor/GraphView) with toggleable ActivityLog pane
-   **Mobile**: Tab-based switching between views
-   **Responsive**: CSS Grid/Flexbox for adaptive layouts
-   **ActivityLog**: Toggleable bottom pane (like VS Code terminal) for system logs

**Implementation Steps**:

1. Create FileTree component for document navigation
2. Create DocumentEditor component for rich text editing
3. Rename Room component to GraphView
4. Convert Activity component to toggleable pane (like VS Code terminal)
5. Implement 2-pane desktop layout with toggleable ActivityLog
6. Add mobile tab switching
7. Test responsive design

### Phase 3B: Data Model Migration

**Goal**: Migrate from room-based to app-scoped data model

**Key Changes**:

-   **Unified data structure**: Treat edges as first-class nodes
-   **Active items index**: Single `activeItems` node containing list of active item IDs
-   **Query-level filtering**: Subscribe to `activeItems` and dynamically subscribe to individual items
-   **Links-as-nodes**: All graph elements treated as 'items' in single collection

**Implementation Steps**:

1. Define unified data structure schema
2. Update graph write operations to use single `items` collection
3. Implement `activeItems` index maintenance
4. Update query logic to use active items filtering

### Phase 3C: Content Management

**Goal**: Implement document-centric content management

**Features**:

-   **Markdown support**: Rich text editing with live preview
-   **Wiki-style links**: `[[document name]]` syntax for internal links
-   **Auto-generated graph**: Visual representation of document relationships
-   **Search and navigation**: Full-text search across documents
-   **Version control**: Document history and change tracking
-   **Authorization UX**: User-friendly modals for authentication, identity creation, and login flows

## Why This Approach?

-   **Build on clean foundation** - Leverage existing controller architecture and clean gunWrapper
-   **Reduce risk** - Smaller, testable changes with clear migration path
-   **Performance focus** - Address high-frequency update issues through query-level filtering

## Testing Approach

**CRITICAL: Exact Replication Testing**

-   **Functional regression testing** - every current feature works exactly the same
-   **Visual regression testing** - exact same appearance and layout
-   **Interaction testing** - all current user interactions work identically
-   **Performance testing** - no performance regression

**Note**: See `ARCHITECTURE.md` for detailed testing principles and method organization guidelines.

## Success Criteria

### Phase 3 Complete When:

-   **Document-centric UI** - FileTree, DocumentEditor, GraphView components implemented
-   **App-scoped data model** - Unified items collection with active items index
-   **Links-as-nodes approach** - All graph elements treated as first-class nodes
-   **Query-level filtering** - High-frequency update issue resolved
-   **Responsive layout** - 2-pane desktop, mobile tab switching
-   **All existing functionality** works with new architecture
-   **Performance improvements** - No more "1K+ records per second" warnings

## Next Steps

1. **Review GUN\_ planning documents** - Understand current architectural approach
2. **Begin Phase 3A** - Start with data model migration
3. **Implement active items index** - Follow `GUN_STREAM_THROTTLING.md` approach
4. **Update UI components** - Migrate to document-centric design
5. **Test and validate** - Ensure all functionality works with new architecture

**Note**: This phase represents the final evolution of the application from a room-based graph editor to a document-centric knowledge management system. See `ARCHITECTURE.md` for core architectural principles that guide this migration.
