# Reader App Development Plan

## Overview

PWA that opens custom .smartText files with embedded UI instructions. Files contain data + schema for dynamic UI generation.

## File Format (.smartText)

-   SQLite database with metadata table
-   Version field for compatibility
-   UI schema stored as JSON
-   Data tables defined by schema

## Implementation Phases

### Phase 1: File System Integration ✅

-   [x] FileService with File System Access API
-   [x] File picker for .smartText files
-   [x] Create/save file operations
-   [x] Test UI with file operations

### Phase 2: Database Service ✅

-   [x] DatabaseService with sql.js
-   [x] Load .smartText files as SQLite databases
-   [x] Query database tables
-   [x] Version detection and compatibility
-   [x] Test UI for database operations
-   [x] CRUD operations (insert, update, delete)
-   [x] Auto-save on database changes
-   [x] Enhanced metadata schema with field definitions

### Phase 3: Dynamic UI Generation ✅

-   [x] Dynamic form generation from schema
-   [x] Version-specific control rendering
-   [x] Data binding and CRUD operations
-   [x] Test UI for dynamic generation

### Phase 4: Integration & Polish

-   [x] Connect all services
-   [ ] Remove test UI
-   [ ] PWA installation
-   [ ] File association
-   [x] Error handling and validation

## Implementation Notes

**Schema Handling**: Schema is accessed directly via `databaseService.getSchema()` - no separate SchemaService needed. Dynamic UI generation works directly with the schema object from the database metadata.

## Schema Evolution Examples

**Version 1.0:** Enhanced list with status tracking (IMPLEMENTED)

```json
{
	"version": "1.0",
	"type": "list",
	"tableName": "items",
	"fields": [
		{
			"name": "id",
			"displayName": "ID",
			"type": "integer",
			"primaryKey": true,
			"autoIncrement": true
		},
		{
			"name": "text",
			"displayName": "Text",
			"type": "text",
			"required": true
		},
		{
			"name": "status",
			"displayName": "Status",
			"type": "enum",
			"options": ["Todo", "Doing", "Done"],
			"defaultValue": "Todo"
		},
		{
			"name": "created_at",
			"displayName": "Created",
			"type": "datetime",
			"readOnly": true
		},
		{
			"name": "modified_at",
			"displayName": "Modified",
			"type": "datetime",
			"readOnly": true
		}
	],
	"controls": ["add", "edit", "delete"]
}
```

**Future Versions:** Planned enhancements

```json
{
	"version": "1.1",
	"type": "list",
	"tableName": "items",
	"fields": [...],
	"controls": ["add", "edit", "delete", "filter"],
	"filters": ["text", "status"]
}
```

## Testing Strategy

-   Each service gets test buttons in UI
-   Verify functionality before integration
-   Test file operations, database loading, dynamic UI generation
-   Remove test UI in final phase

**Current Test UI Status:**

-   ✅ File operations: Create/Open .smartText files
-   ✅ Database operations: Insert, Update, Delete, Bulk Upsert
-   ✅ Dynamic UI: Schema-driven form generation and data display
-   ✅ Metadata editing: Title and description updates
-   ✅ Auto-save: Automatic file saving on database changes

## Remaining Work

**Phase 4 Tasks:**

-   Remove test UI elements and replace with production UI
-   Implement PWA manifest and service worker
-   Add file association for .smartText files
-   Polish error handling and user experience

**Current Status:** The core functionality is complete and working. The app can create, open, and manage .smartText files with full CRUD operations and dynamic UI generation based on embedded schemas.
