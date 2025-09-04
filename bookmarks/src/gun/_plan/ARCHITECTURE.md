# Gun App Architecture

> **⚠️ IMPORTANT FOR AI ASSISTANTS**: This document contains specific guidance marked with "ask for guidance" or "ask about it". When you encounter these markers, you MUST ask the user for clarification rather than making assumptions or proceeding with your best guess. This is critical for maintaining code quality and architectural consistency.
>
> **⚠️ CHANGE SCOPE GUIDANCE**: One or two changes is good to do independently at a time. If you think there will be many changes or you have to try multiple different approaches before getting it right, STOP and ask if this is the right way to go. Don't go crazy with tons of changes without confirming the approach first.
>
> **⚠️ CODE STYLE GUIDANCE**: Prefer TERSE code that is not over-engineered. Stick to the established patterns and don't deviate unless there is a good reason. When you do have to deviate, ask first! Keep it simple, direct, and follow the architectural principles outlined below.

## File Structure

```
src/gun/
├── Component/ (generic term - examples: Activity/, Header/, Room/)
│   ├── Component.js (pure UI, no controller knowledge)
│   ├── Component.css
│   └── ComponentController.js (handles all events, owns UI)
├── App/
│   ├── handlersConnection.js (connection logic modules for AppController)
│   ├── handlersGraphRead.js (graph read operation modules for AppController)
│   ├── handlersGraphWrite.js (graph write operation modules for AppController)
│   ├── handlersRoom.js (room operation modules for AppController)
│   └── AppController.js (main controller that uses handler modules for code organization)
├── _lib/
│   ├── gunWrapper.js (GunDB wrapper)
│   ├── gun.utils.js (utility functions for gunWrapper exclusively)
│   ├── utils.js (general utility functions - addEventListener, dispatchEvent, log, etc.)
│   └── gun.discovery.js (network discovery)
└── gun.js (main app entry point)
```

## Core Architecture Principles

### Controller Pattern

**Core Principles:**

-   **Controller owns UI completely**: `this.ui = new Component()`
-   **UI components are pure renderers**: No business logic, no controller knowledge
-   **Event-driven communication**: All interactions via DOM events
-   **Centralized event handling**: Controller binds all events in `setupEventListeners()`

**Responsibilities:**

-   **Controller**: Creates UI, handles all events, coordinates with AppController, calls UI methods
-   **UI Component**: Pure rendering only, no event binding, no AppController dependencies
-   **AppController**: Business logic, GunDB operations, emit events (uses handler modules for code organization)

**Controller Size Guidelines:**

-   **Controllers should be pretty skinny** - primarily event wiring and UI coordination
-   **Exception**: AppController is allowed to be larger, but should still be relatively small since it uses handler modules for all of its business logic
-   **If a controller is getting large or complex, consider:**
    -   Moving business logic to AppController
    -   Breaking down into smaller, focused controllers
    -   Extracting complex UI logic into utility functions
    -   Reviewing if the controller is doing too much

### Architecture Flow

```
A. User Action → DOM Events → Controller → AppController
B. User Action → DOM Events → AppController (cases where the controller does not need to act as intermediary)
C. Controller → AppController (via events)
D. External Events → DOM Events → Controller → UI
```

**Flow Explanations:**
A) When user interactions need UI coordination, validation, or transformation before reaching AppController
B) When user actions can go directly to AppController without controller intervention (e.g., simple button clicks that trigger AppController methods)
C) When controllers initiate actions or need to coordinate with AppController
D) When external events (network changes, data updates) need to trigger UI updates

**Note**: Controllers communicate with AppController via DOM events. All business logic is handled by AppController, which uses handler modules to organize its code.

### Method Organization Principles

**Class Method Definition Guidelines:**

-   **Methods defined in class body should be of significance in terms of line count and complexity**

**For simple methods (1-3 lines, basic passthroughs, or simple assignments):**

-   Prefer inlining in constructor or initialization methods
-   Use arrow function assignments: `this.methodName = () => this._rawGun.someMethod()`
-   Avoid verbose class body definitions for trivial operations
-   **If unsure whether a method is simple enough for inline, ask for guidance**

**For complex methods (substantial logic, multiple operations, error handling):**

-   Define as separate methods in class body
-   Include proper JSDoc documentation
-   Examples: `getDetailedPeerInfo()`, `getNetworkInfo()`, `testConnection()`
-   **Prefer that methods defined in class body are substantial blocks, not just dumb wrappers around other functions**

**Benefits:**

-   Cleaner, more readable class definitions
-   Reduces boilerplate for simple operations
-   Makes complex methods stand out clearly
-   Better separation of concerns

**Example:**

```javascript
class GunDBWrapper {
	constructor() {
		// Simple methods - inline assignments
		this.get = this._rawGun.get.bind(this._rawGun);
		this.connect = () => this.reinitialize();
		this.getPeers = () => this._rawGun.back('opt.peers') || {};
	}

	// Complex method - separate definition
	getDetailedPeerInfo() {
		const peers = this.getPeers();
		// ... substantial logic here
		return detailedInfo;
	}
}
```

### Decision-Making Guidelines

**Flow Pattern Selection:**

-   **Prefer pattern B (User Action → AppController) when possible.** If you need or notice pattern A (User Action → Controller → AppController), ask about it to ensure it's the right approach.

**Event Creation:**

-   **Use existing event patterns when possible.**
-   **Before creating new events that are not found in the system already, ask for guidance.**

**Method Organization:**

-   **If unsure whether a method is simple enough for inline definition, ask for guidance.** The general rule is 1-3 lines should go inline, or where no significant change is needed.

**Controller Pattern:**

-   **All controllers should follow the `setupEventListeners()` pattern** for consistent event handling across the application.

## Implementation Guidelines

### UI Event Delegation Pattern (CRITICAL - ALWAYS USE FOR Controller to UI event binding)

**UI Event Binding:**

-   **ALL UI events bound in controller**: Use `setupEventListeners()` method
-   **Event delegation on component DOM**: `this.ui.container.addEventListener('click', (e) => { ... })`
-   **Target matching**: Use `e.target.matches('#buttonId')` for delegation
-   **Scoped to component**: Events bound to component's container, not document-wide
-   **NO direct event binding in UI components**: UI components must never bind events directly
-   **Use utility methods**: Prefer `addEventListener()` and `dispatchEvent()` utility functions over native methods (except for UI event delegation on component containers). These utilities are defined in `utils.js`.

**CSS Requirements:**

-   **Use `pointer-events: none` on child elements**: Prevents clicks on SVG icons, text, etc. from interfering with button clicks
-   **Example**: `#copyLog svg, #clearLog svg { pointer-events: none; }`

### Implementation Template

```javascript
//Controller.js
setupEventListeners() {
    // Event delegation for UI buttons (scoped to component DOM)
    this.ui.container.addEventListener('click', (e) => {
        if (e.target.matches('#buttonId')) {
            this.handleButtonClick();
        }
    });

    // Listen for external events, ie. from other controllers (use utility method)
    addEventListener('external:event', (e) => {
        this.handleExternalEvent(e.detail);
    });

    // Dispatch events, ie from other components (use utility method)
    dispatchEvent('ui:action', { data: 'example' });
}
```

### Key Requirements

-   **UI components have ZERO event binding code**
-   **All event handling centralized in controller**
-   **No controller references passed to UI components**
-   **Events scoped to component's DOM container**
-   **Controller owns UI completely**: `this.ui = new Component()`

### AppController Communication

-   Controllers communicate with AppController via DOM events
-   AppController handles all business logic and GunDB operations
-   Controllers only handle UI events and coordinate with AppController

**Example**: `ActivityController` listens to generic `activity:log` DOM events from AppController, rather than binding directly to specific AppController methods.

## Reference Material

### Utils.js Anatomy

The `utils.js` file contains general utility functions used throughout the application:

-   **`$()`** - DOM element selector utility (`document.getElementById`)
-   **`addEventListener()`** - Event listener utility (preferred over native addEventListener)
-   **`dispatchEvent()`** - Event dispatching utility (preferred over native dispatchEvent)
-   **`log()`** - Logging utility that fires activity log events
-   **`uuid() / generateId()`** - UUID generation utility
-   **`tryJSONParse()`** - Safe JSON parsing with fallback
-   **`html()`** - Tagged template literal for HTML generation (a dummy function that lets us syntax highlight html strings using lit)

**Note**: These utilities should be used consistently across the application for event handling, logging, and DOM manipulation.

### Event Catalog

This section documents all events used throughout the application for reference and consistency.

**⚠️ IMPORTANT**: Before creating new events that are not found in the system already, ask for guidance. Use existing event patterns when possible.

#### Application Events

-   **`app:init`** - Application initialization event fired on startup

#### Authentication Events

-   **`auth:authenticated`** - User successfully authenticated with alias
-   **`auth:anonymous`** - User is in anonymous mode

#### Network Events

-   **`network:connecting`** - Network connection in progress
-   **`network:connected`** - Network successfully connected with peer count
-   **`network:disconnected`** - Network disconnected
-   **`network:infoRequest`** - Request for network information
-   **`network:infoResponse`** - Network information response with peer details
-   **`networkDiscovery`** - Trigger network discovery process

#### Room Events

-   **`room:joining`** - Room join process started
-   **`room:joined`** - Room successfully joined with graph root
-   **`room:leaving`** - Room leave process started
-   **`room:left`** - Room successfully left
-   **`room:exportRequested`** - Room export requested
-   **`room:exportCompleted`** - Room export completed with data
-   **`room:importRequested`** - Room import requested with data
-   **`room:importCompleted`** - Room import completed with success status

#### UI Events

-   **`ui:connect`** - Connect button clicked
-   **`ui:disconnect`** - Disconnect button clicked
-   **`ui:testConnection`** - Test connection button clicked
-   **`ui:createIdentity`** - Create identity button clicked
-   **`ui:login`** - Login button clicked
-   **`ui:showConnectionDetails`** - Show connection details modal
-   **`ui:joinRoom`** - Join room button clicked
-   **`ui:leaveRoom`** - Leave room button clicked
-   **`ui:roomPaneConnected`** - Room pane connected state
-   **`ui:roomPaneDisconnected`** - Room pane disconnected state

#### Graph Sync Events

-   **`sync:clearGraph`** - Clear all graph data
-   **`sync:addNode`** - Add node to graph
-   **`sync:removeNode`** - Remove node from graph
-   **`sync:addEdge`** - Add edge to graph
-   **`sync:removeEdge`** - Remove edge from graph

#### Graph Operation Events

-   **`graph:nodeUpsert`** - Upsert node operation
-   **`graph:nodeDelete`** - Delete node operation
-   **`graph:edgeUpsert`** - Upsert edge operation
-   **`graph:edgeDelete`** - Delete edge operation
-   **`graph:select`** - Graph element selected
-   **`graph:propsLoaded`** - Element properties loaded
-   **`graph:search`** - Graph search performed
-   **`graph:clearSearch`** - Graph search cleared
-   **`graph:layoutChange`** - Graph layout changed
-   **`graph:fit`** - Fit graph to view
-   **`graph:searchRequested`** - Search requested with query
-   **`graph:searchCleared`** - Search cleared
-   **`graph:fitRequested`** - Fit graph requested

#### Activity Events

-   **`activity:log`** - Log message for activity display

#### Native DOM Events

-   **`click`** - Button and element clicks (UI delegation)
-   **`input`** - Form input changes
-   **`change`** - Form selection changes
-   **`keydown`** - Keyboard input
-   **`resize`** - Window resize
-   **`DOMContentLoaded`** - Document ready
