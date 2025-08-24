# GunDB Collaborative Graph

A real-time collaborative graph visualization tool built with GunDB and Cytoscape.js.

## Architecture

```
gun/
├── gun.js                 # Main application orchestrator
├── gun.css                # Styles
├── components/            # UI components
│   ├── header/           # Network status, auth, room management
│   ├── forms/            # Node/edge creation forms
│   ├── graph/            # Graph view controls
│   ├── visualization/    # Cytoscape graph rendering
│   ├── sidebar/          # Activity logging
│   ├── PropsManager.js   # Properties display
│   └── RoomList.js       # Room selection
├── services/              # Business logic & GunDB operations
│   ├── eventCoordinator.js # Event coordination
│   ├── stateManager.js   # Application state
│   ├── gunWrapper.js     # Clean GunDB API
│   ├── connection.js     # Peer connections
│   ├── auth.js          # User authentication
│   ├── room.js          # Room management
│   ├── graphOperations.js # CRUD operations
│   └── sync.js          # Data synchronization
├── controllers/           # UI state controllers
└── utils/                # Shared utilities
```

## Key Features

-   **Real-time collaboration** via GunDB
-   **Event-driven architecture** with custom DOM events
-   **Interactive graph visualization** with Cytoscape.js
-   **User authentication** and room management
-   **JSON export/import** functionality
-   **Props loading system** for element properties

## Development

-   **UI Changes**: Modify files in `components/`
-   **Business Logic**: Update files in `services/`
-   **State Management**: Modify `stateManager.js`
-   **Event Flow**: Update `eventCoordinator.js`
-   **Styling**: Edit `gun.css`
-   **Entry Point**: `gun.html` → `gun.js`

## Event System

The application uses custom DOM events for communication:

-   `selectionChanged` → `graph:requestProps` → `graph:propsLoaded`
-   `ui:connect`, `ui:joinRoom`, `ui:leaveRoom`
-   `stateChanged` for state updates
