# Gun App Architecture

## Controller Pattern (Implemented)

### Core Principles

-   **Controller owns UI completely**: `this.ui = new Component()`
-   **UI components are pure renderers**: No business logic, no controller knowledge
-   **Event-driven communication**: All interactions via DOM events
-   **Centralized event handling**: Controller binds all events in `setupEventListeners()`

### Architecture Flow

```
User Action → DOM Events → Controller → Services
External Events → DOM Events → Controller → UI
Controller → Services (direct calls for now)
```

**Note**: Controllers currently bind to services directly (e.g., `StateManager` events), but this is **NOT preferred**. Future goal is all communication via DOM events.

### Responsibilities

-   **Controller**: Creates UI, handles all events, coordinates services, calls UI methods
-   **UI Component**: Pure rendering only, no event binding, no service dependencies
-   **Services**: Data operations, emit events

### Service Binding (Current vs. Preferred)

**Current (Acceptable but not preferred):**

-   Controllers bind to service events in constructor
-   Controllers call services directly
-   Example: `StateManager` events bound in `HeaderController`

**Preferred (Future goal):**

-   All communication via DOM events
-   No direct service dependencies in controllers
-   Services emit DOM events, controllers listen to DOM events

**Example of preferred pattern**: `ActivityController` listens to generic `activity:log` DOM events from any service, rather than binding directly to specific service events.

## Implementation Requirements

### Event Delegation Pattern (CRITICAL)

**UI Event Binding:**

-   **ALL UI events bound in controller**: Use `setupEventListeners()` method
-   **Event delegation on component DOM**: `this.ui.container.addEventListener('click', (e) => { ... })`
-   **Target matching**: Use `e.target.matches('#buttonId')` for delegation
-   **Scoped to component**: Events bound to component's container, not document-wide

**CSS Requirements:**

-   **Use `pointer-events: none` on child elements**: Prevents clicks on SVG icons, text, etc. from interfering with button clicks
-   **Example**: `#copyLog svg, #clearLog svg { pointer-events: none; }`

### Implementation Template

```javascript
setupEventListeners() {
    // Event delegation for UI buttons (scoped to component DOM)
    this.ui.container.addEventListener('click', (e) => {
        if (e.target.matches('#buttonId')) {
            this.handleButtonClick();
        }
    });

    // Listen for external events
    document.addEventListener('external:event', (e) => {
        this.handleExternalEvent(e.detail);
    });
}
```

### Key Requirements

-   **UI components have ZERO event binding code**
-   **All event handling centralized in controller**
-   **No controller references passed to UI components**
-   **Events scoped to component's DOM container**
-   **Controller owns UI completely**: `this.ui = new Component()`

## Method Organization Principles

### Class Method Definition Guidelines

**Methods defined in class body should be of significance in terms of line count and complexity.**

**For simple methods (1-3 lines, basic passthroughs, or simple assignments):**

-   Prefer inlining in constructor or initialization methods
-   Use arrow function assignments: `this.methodName = () => this._rawGun.someMethod()`
-   Avoid verbose class body definitions for trivial operations

**For complex methods (substantial logic, multiple operations, error handling):**

-   Define as separate methods in class body
-   Include proper JSDoc documentation
-   Examples: `getDetailedPeerInfo()`, `getNetworkInfo()`, `testConnection()`

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
