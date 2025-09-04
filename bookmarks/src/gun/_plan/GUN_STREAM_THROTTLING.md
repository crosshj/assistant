# Stream Throttling Plan

## Problem

Stream handlers fire individual DOM events for every data change → "1K+ records per second" warnings + DOM overwhelm.

## Selected Approach: Query-Level Filtering + App-Scoped Migration

### Core Concept

-   Use active items index to avoid tombstoned nodes/edges
-   Treat edges as first-class nodes (links-as-nodes approach)
-   Single unified index for both nodes and edges

### Data Structure

```javascript
// Unified structure with edges as nodes
{
  "activeItems": ["nodeId1", "edgeId1", "nodeId2", "edgeId2"],
  "nodeId1": { "type": "bookmark", "title": "...", "url": "..." },
  "edgeId1": { "type": "edge", "from": "nodeId1", "to": "nodeId2", "label": "..." },
  "nodeId2": { "type": "tag", "name": "..." }
}
```

### Query Pattern

```javascript
// Get active items list (nodes + edges)
graphRoot.get('activeItems').once((activeItemIds) => {
	activeItemIds.forEach((itemId) => {
		graphRoot.get('items').get(itemId).on(handleItemUpdate);
	});
});
```

### Implementation

1. **Create unified data structure** - edges as nodes
2. **Add activeItems index** - single list of active items
3. **Update query logic** - use activeItems instead of separate nodes/edges
4. **Unify handlers** - single `handleItemUpdate` for both types
5. **Update UI components** - handle unified item structure

### Files to Modify

-   `src/gun/App/handlersGraphRead.js` - Unified item handlers
-   `src/gun/App/handlersGraphWrite.js` - Unified item creation
-   `src/gun/App/handlersRoom.js` - Update room structure
-   UI components - Handle unified items

### Benefits

-   **No tombstoned items** in the stream
-   **Unified handling** of nodes and edges
-   **App-scoped architecture** ready
-   **No performance issues** - only active items
-   **Simpler code** - single item type to handle
