# Reader App Architecture

> **⚠️ IMPORTANT FOR AI ASSISTANTS**: This document contains specific guidance marked with "ask for guidance" or "ask about it". When you encounter these markers, you MUST ask the user for clarification rather than making assumptions or proceeding with your best guess. This is critical for maintaining code quality and architectural consistency.
>
> **⚠️ CHANGE SCOPE GUIDANCE**: One or two changes is good to do independently at a time. If you think there will be many changes or you have to try multiple different approaches before getting it right, STOP and ask if this is the right way to go. Don't go crazy with tons of changes without confirming the approach first.
>
> **⚠️ CODE STYLE GUIDANCE**: Prefer TERSE code that is not over-engineered. Stick to the established patterns and don't deviate unless there is a good reason. When you do have to deviate, ask first! Keep it simple, direct, and follow the architectural principles outlined below.

## File Structure

```
src/reader/
├── Component/ (generic term - examples: Reader/, FileViewer/, DataEditor/)
│   ├── Component.js (pure UI, no controller knowledge)
│   ├── Component.css
│   └── ComponentController.js (handles all events, owns UI)
├── Application/
│   ├── handlersFiles.js (file operation modules for ApplicationController)
│   ├── handlersDatabase.js (database operation modules for ApplicationController)
│   ├── handlersSchema.js (schema operation modules for ApplicationController)
│   └── ApplicationController.js (main controller that uses handler modules for code organization)
├── _lib/
│   ├── fileService.js (File System Access API wrapper)
│   ├── databaseService.js (SQLite operations using sql.js)
│   ├── schemaService.js (UI schema parsing and validation)
│   └── utils.js (general utility functions - addEventListener, dispatchEvent, log, etc.)
└── reader.js (main app entry point)
```

## Core Architecture Principles

### Controller Pattern

**Core Principles:**

-   **Controller owns UI completely**: `this.ui = new Component()`
-   **UI components are pure renderers**: No business logic, no controller knowledge
-   **Event-driven communication**: All interactions via DOM events
-   **Centralized event handling**: Controller binds all events in `setupEventListeners()`

**Responsibilities:**

-   **Controller**: Creates UI, handles all events, coordinates with ApplicationController, calls UI methods
-   **UI Component**: Pure rendering only, no event binding, no ApplicationController dependencies
-   **ApplicationController**: Business logic, file operations, database operations, emit events (uses handler modules for code organization)

**Controller Size Guidelines:**

-   **Controllers should be pretty skinny** - primarily event wiring and UI coordination
-   **Exception**: ApplicationController is allowed to be larger, but should still be relatively small since it uses handler modules for all of its business logic
-   **If a controller is getting large or complex, consider:**
    -   Moving business logic to ApplicationController
    -   Breaking down into smaller, focused controllers
    -   Extracting complex UI logic into utility functions
    -   Reviewing if the controller is doing too much

### Architecture Flow

```
A. User Action → DOM Events → Controller → ApplicationController
B. User Action → DOM Events → ApplicationController (cases where the controller does not need to act as intermediary)
C. Controller → ApplicationController (via events)
D. External Events → DOM Events → Controller → UI
```

**Flow Explanations:**
A) When user interactions need UI coordination, validation, or transformation before reaching ApplicationController
B) When user actions can go directly to ApplicationController without controller intervention (e.g., simple button clicks that trigger ApplicationController methods)
C) When controllers initiate actions or need to coordinate with ApplicationController
D) When external events (file changes, data updates) need to trigger UI updates

**Note**: Controllers communicate with ApplicationController via DOM events. All business logic is handled by ApplicationController, which uses handler modules to organize its code.

### Method Organization Principles

**Class Method Definition Guidelines:**

-   **Methods defined in class body should be of significance in terms of line count and complexity**

**For simple methods (1-3 lines, basic passthroughs, or simple assignments):**

-   Prefer inlining in constructor or initialization methods
-   Use arrow function assignments: `this.methodName = () => this._service.someMethod()`
-   Avoid verbose class body definitions for trivial operations
-   **If unsure whether a method is simple enough for inline, ask for guidance**

**For complex methods (substantial logic, multiple operations, error handling):**

-   Define as separate methods in class body
-   Include proper JSDoc documentation
-   Examples: `loadDatabase()`, `parseSchema()`, `generateUI()`
-   **Prefer that methods defined in class body are substantial blocks, not just dumb wrappers around other functions**

**Benefits:**

-   Cleaner, more readable class definitions
-   Reduces boilerplate for simple operations
-   Makes complex methods stand out clearly
-   Better separation of concerns

**Example:**

```javascript
class DatabaseService {
	constructor() {
		// Simple methods - inline assignments
		this.get = this._db.get.bind(this._db);
		this.save = () => this._db.save();
		this.clear = () => this._db.clear();
	}

	// Complex method - separate definition
	loadFromFile(fileData) {
		// ... substantial logic here
		return database;
	}
}
```

### Decision-Making Guidelines

**Flow Pattern Selection:**

-   **Prefer pattern B (User Action → ApplicationController) when possible.** If you need or notice pattern A (User Action → Controller → ApplicationController), ask about it to ensure it's the right approach.

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
-   **Example**: `#saveBtn svg, #loadBtn svg { pointer-events: none; }`

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

### ApplicationController Communication

-   Controllers communicate with ApplicationController via DOM events
-   ApplicationController handles all business logic and file operations
-   Controllers only handle UI events and coordinate with ApplicationController

**Example**: `ReaderController` listens to generic `file:opened` DOM events from ApplicationController, rather than binding directly to specific ApplicationController methods.

## Reference Material

### Utils.js Anatomy

The `utils.js` file contains general utility functions used throughout the application:

-   **`$()`** - DOM element selector utility (`document.getElementById`)
-   **`addEventListener()`** - Event listener utility (preferred over native addEventListener)
-   **`dispatchEvent()`** - Event dispatching utility (preferred over native dispatchEvent)
-   **`log()`** - Logging utility (currently unused - test operations use console.log)
-   **`uuid() / generateId()`** - UUID generation utility
-   **`tryJSONParse()`** - Safe JSON parsing with fallback
-   **`html()`** - Tagged template literal for HTML generation (a dummy function that lets us syntax highlight html strings using lit)

**Note**: These utilities should be used consistently across the application for event handling, logging, and DOM manipulation.

### Event Catalog

This section documents all events used throughout the application for reference and consistency.

**⚠️ IMPORTANT**: Before creating new events that are not found in the system already, ask for guidance. Use existing event patterns when possible.

#### Application Events

-   **`app:init`** - Application initialization event fired on startup
-   **`reader:ready`** - Reader application ready event

#### File Events

-   **`file:opened`** - File successfully opened (enables save button)
-   **`file:content`** - File content loaded and ready for display
-   **`file:saved`** - File successfully saved

#### Database Events

-   **`db:loaded`** - Database successfully loaded from file
-   **`db:query`** - Database query executed
-   **`db:error`** - Database operation error

#### Schema Events

-   **`schema:parsed`** - UI schema successfully parsed
-   **`schema:error`** - Schema parsing error
-   **`ui:generated`** - Dynamic UI generated from schema

#### UI Events

-   **`ui:testFilePicker`** - Test file picker button clicked
-   **`ui:testCreateFile`** - Test create file button clicked
-   **`ui:testSaveFile`** - Test save file button clicked

#### Native DOM Events

-   **`click`** - Button and element clicks (UI delegation)
-   **`input`** - Form input changes
-   **`change`** - Form selection changes
-   **`keydown`** - Keyboard input
-   **`resize`** - Window resize
-   **`DOMContentLoaded`** - Document ready
