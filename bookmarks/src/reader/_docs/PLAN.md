# Reader App Development Plan

## Overview

PWA that opens custom .rdb files with embedded UI instructions. Files contain data + schema for dynamic UI generation.

## File Format (.rdb)

-   SQLite database with metadata table
-   Version field for compatibility
-   UI schema stored as JSON
-   Data tables defined by schema

## Implementation Phases

### Phase 1: File System Integration ✅

-   [x] FileService with File System Access API
-   [x] File picker for .rdb files
-   [x] Create/save file operations
-   [x] Test UI with file operations

### Phase 2: Database Service

-   [ ] DatabaseService with sql.js
-   [ ] Load .rdb files as SQLite databases
-   [ ] Query database tables
-   [ ] Version detection and compatibility
-   [ ] Test UI for database operations

### Phase 3: Schema Service

-   [ ] SchemaService for JSON schema parsing
-   [ ] UI schema validation
-   [ ] Version-specific schema handling
-   [ ] Test UI for schema operations

### Phase 4: Dynamic UI Generation

-   [ ] Dynamic form generation from schema
-   [ ] Version-specific control rendering
-   [ ] Data binding and CRUD operations
-   [ ] Test UI for dynamic generation

### Phase 5: Integration & Polish

-   [ ] Connect all services
-   [ ] Remove test UI
-   [ ] PWA installation
-   [ ] File association
-   [ ] Error handling and validation

## Schema Evolution Examples

**Version 1.0:** Simple list

```json
{
	"version": "1.0",
	"type": "list",
	"fields": ["text"],
	"controls": ["add", "edit", "delete"]
}
```

**Version 1.1:** List with filtering

```json
{
	"version": "1.1",
	"type": "list",
	"fields": ["text"],
	"controls": ["add", "edit", "delete", "filter"],
	"filters": ["text"]
}
```

**Version 1.2:** List with completion

```json
{
	"version": "1.2",
	"type": "list",
	"fields": ["text", "done"],
	"controls": ["add", "edit", "delete", "filter", "toggle_done"],
	"filters": ["text", "status"]
}
```

## Testing Strategy

-   Each service gets test buttons in UI
-   Verify functionality before integration
-   Test file operations, database loading, schema parsing
-   Remove test UI in final phase
