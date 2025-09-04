# GunDB Network Discovery & Privacy

## Overview

This document summarizes findings from network discovery and privacy implications of the current GunDB setup.

## Network Discovery Results

### Current Network Activity

-   **Very active network**: 1K+ records syncing per second
-   **10 active users** discovered in `users` namespace
-   **Massive presence data**: Real-time user sessions and activity
-   **Connection rate**: 50% (1/2 peers connected)
-   **Features enabled**: localStorage, multicast, WebRTC all active

### Namespace Analysis

-   **Found 1 active app namespace**: `graphs` with 2 keys
-   **Your rooms**: `public` and `super-duper` (both empty)
-   **Other activity**: Primarily in `presence` and user-scoped data
-   **No other apps** using the `graphs` namespace structure

### Data Isolation Patterns

Different apps use different namespace patterns:

```javascript
// Your bookmarks app
gun.get('graphs').get(roomName).get('nodes');

// Other potential apps
gun.get('chat').get('room1');
gun.get('game').get('lobby');
gun.get('social').get('posts');
```

## Privacy & Discoverability

### Current State: Completely Public

Your data is currently **fully discoverable**:

```javascript
// Anyone can see your room names
gun.get('graphs').once((data) => {
	// Shows: { public: {...}, super-duper: {...} }
});

// Anyone can access your room data
gun.get('graphs').get('public').get('nodes').map().on(callback);
```

### What Others Can See

-   ✅ Your room names (`public`, `super-duper`)
-   ✅ Your data structure (nodes, edges, props)
-   ✅ Any data you put in those rooms
-   ✅ When you're active (timestamps)
-   ✅ Your app's namespace pattern

### Privacy Options

#### 1. User-Scoped (Private)

```javascript
// Only you can access
gun.user().get('graphs').get('public');
```

#### 2. App-Specific Namespace

```javascript
// Unique namespace reduces discoverability
gun.get('bookmarks-app-' + uniqueId).get('graphs');
```

#### 3. Hybrid Approach

```javascript
// Public rooms (discoverable)
gun.get('graphs').get('public');

// Private rooms (hidden)
gun.user().get('graphs').get('private');
```

#### 4. Encrypted Content

```javascript
// Discoverable structure, encrypted data
gun.user().get('graphs').get('public').put(encryptedData);
```

## Key Insights

### Why Network Seems "Empty" But Is Active

-   **Namespace isolation**: Other apps use different root keys
-   **User-scoped data**: Much activity is in private user spaces (`~` prefix)
-   **Different structures**: Apps organize data differently within namespaces
-   **Presence vs. Content**: Lots of session/presence data, less visible content

### Network Health

-   ✅ **Healthy network**: High activity, good connectivity
-   ✅ **Peer discovery working**: Multicast + WebRTC active
-   ✅ **Data persistence**: 742KB local storage, active relays
-   ✅ **Real-time sync**: 1K+ records/second indicates live network

### Your App's Position

-   **Well-isolated**: Your `graphs` namespace doesn't conflict with others
-   **Discoverable**: Others could find and join your rooms if they knew the pattern
-   **Collaborative ready**: Current setup supports multi-user collaboration
-   **Privacy consideration**: Currently fully public - consider user-scoped for sensitive data

## Recommendations

### For Public/Collaborative Use

-   Keep current structure
-   Consider adding room discovery mechanisms
-   Implement proper access controls for sensitive rooms

### For Private Use

-   Move to user-scoped: `gun.user().get('graphs')`
-   Or use unique app namespace
-   Consider encryption for sensitive data

### Hybrid Approach

-   Public rooms for collaboration
-   Private rooms for personal data
-   Clear naming conventions to distinguish

## Network Discovery Tool

The network discovery feature provides:

-   **Peer endpoint scanning**: Tests for REST catalogs
-   **GunDB catalog queries**: Searches for common data patterns
-   **User discovery**: Finds active users and sessions
-   **Persistence analysis**: Checks for stored data and recent activity
-   **Namespace discovery**: Scans for active app namespaces
-   **Network statistics**: Connection rates and feature status

Access via: Peer Modal → "Network Discovery" button → Check console logs
