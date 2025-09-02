# GunDB Collaborative Graph

A real-time collaborative graph visualization tool built with GunDB and Cytoscape.js.

## Architecture

```
gun/
├── gun.js                 # Main application orchestrator
├── gun.css                # Styles
├── _lib/                  # Core libraries
│   ├── gunWrapper.js     # GunDB operations wrapper
│   ├── cytoscapeWrapper.js # Cytoscape.js integration
│   └── utils.js          # Shared utilities
├── services/              # Business logic & data operations
│   ├── connection.js     # Peer connections
│   ├── props.js          # Properties management
│   ├── room.js           # Room management
│   └── sync.js           # Data synchronization
├── Header/                # Header component with controller
│   ├── Header.js         # Pure UI component
│   ├── Header.css        # Component styles
│   └── HeaderController.js # Event handling & coordination
├── Room/                  # Room component with controller
│   ├── Room.js           # Pure UI component
│   ├── Room.css          # Component styles
│   └── RoomController.js # Event handling & coordination
├── Activity/              # Activity component with controller
│   ├── Activity.js       # Pure UI component
│   ├── Activity.css      # Component styles
│   └── ActivityController.js # Event handling & coordination
├── Connection/     # Connection component with controller
│   ├── Connection.js # Pure UI component
│   ├── Connection.css # Component styles
│   └── ConnectionController.js # Event handling & coordination
├── _plan/                 # Planning & documentation
│   ├── ARCHITECTURE.md   # Controller pattern documentation
│   ├── REFACTOR_PLAN.md  # Main refactoring plan
│   ├── PHASE2_PLAN.md    # Phase 2 detailed plan
│   ├── MIGRATION_TO_APP_SCOPED.md # Future app-scoped migration
│   └── *.md              # Other planning documents
└── README.md             # This file
```

## Key Features

-   **Real-time collaboration** via GunDB
-   **Event-driven architecture** with custom DOM events
-   **Interactive graph visualization** with Cytoscape.js
-   **User authentication** and room management
-   **JSON export/import** functionality
-   **Props loading system** for element properties

## Development

-   **UI Components**: Modify files in component folders (e.g., `Header/Header.js`)
-   **Event Handling**: Update controller files (e.g., `Header/HeaderController.js`)
-   **Business Logic**: Update files in `services/`
-   **GunDB Operations**: Modify `_lib/gunWrapper.js`
-   **Styling**: Edit component CSS files or `gun.css`
-   **Entry Point**: `gun.html` → `gun.js`

## Event System

The application uses a controller-based architecture with custom DOM events:

-   **Controllers handle all event wiring** - Each component has a dedicated controller
-   **Pure UI components** - Components only render, no business logic
-   **Event-driven communication** - Controllers coordinate between UI and services
-   **Custom DOM events** - `ui:connect`, `ui:joinRoom`, `activity:log`, etc.

### Controller Pattern

Each major UI component follows this pattern:

-   `Component.js` - Pure UI rendering
-   `Component.css` - Component-specific styles
-   `ComponentController.js` - Event handling and coordination
