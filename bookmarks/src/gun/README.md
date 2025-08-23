# GunDB Collaborative Graph

A real-time collaborative graph visualization tool built with GunDB and Cytoscape.js.

## Structure

```
gun/
├── gun.js                 # Main application
├── gun.css                # Styles
├── components/            # UI components (header, forms, graph, sidebar, visualization)
├── services/              # GunDB & business logic
└── utils/                 # Shared utilities
```

## Key Features

-   **Real-time collaboration** via GunDB
-   **Interactive graph visualization** with Cytoscape.js
-   **User authentication** and room management
-   **JSON export/import** functionality

## Development

-   **UI Changes**: Modify files in `components/`
-   **Data Logic**: Update files in `services/`
-   **Styling**: Edit `gun.css`
-   **Entry Point**: `gun.html` → `gun.js`
