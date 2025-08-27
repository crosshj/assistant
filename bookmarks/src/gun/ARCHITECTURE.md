# Gun App Architecture

## Current Pattern (Established)

### Controller-Component Relationship

-   **Controller creates and owns component**: `this.ui = new Component()`
-   **Component receives controller reference**: `constructor({ controller })`
-   **Controller property naming**: `this.ui` (not `this.component`)

### Event Flow (Current)

```
User Action → Component → Controller → Services (direct calls)
External Events → Controller → Component (via method calls)
Controller → Services (direct calls, binding to service events)
```

### Responsibilities

-   **Controller**: Owns UI, handles events, coordinates services, calls UI methods
-   **Component**: Pure UI rendering, calls controller methods, no service dependencies
-   **Services**: Data operations, emit events

### Service Integration (Current)

-   Controllers receive services in constructor
-   Controllers bind directly to service events
-   Controllers call services directly

## Future Architecture (Preferred)

### Pure UI Pattern

```
Controller → Creates UI → Sets up ALL event listeners → Owns UI completely
UI → Pure rendering → No business logic → No controller knowledge
```

### Event-Driven Communication

```
User Action → DOM Events → Controller → Services
External Events → DOM Events → Controller → UI
Controller → DOM Events → Services
```

### Benefits

-   UI components completely pure (just DOM)
-   No circular dependencies
-   Better separation of concerns
-   Easier testing and reuse

## Implementation Notes

### Current Acceptable

-   Direct service calls from controllers
-   Service event binding in controllers
-   Component knowledge of controller

### Future Goals

-   All communication via DOM events
-   Controllers handle all event binding
-   UI components are pure renderers
-   No component-to-controller dependencies

## File Structure

```
src/gun/
├── Component/
│   ├── Component.js (pure UI, no controller knowledge)
│   ├── Component.css
│   └── ComponentController.js (handles all events, owns UI)
├── services/ (data operations only)
└── gun.js (orchestrates controllers only)
```
