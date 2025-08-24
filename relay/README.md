# GunDB Relay Server

This is a dedicated GunDB relay server for the bookmarks application. It provides a persistent peer-to-peer connection point for sharing data between different instances of the app.

## Local Development

```bash
cd relay
npm install
npm start
```

The server will start on port 8080 (or PORT environment variable).

**Endpoints:**

-   WebSocket: `ws://localhost:8080/gun`
-   HTTP: `http://localhost:8080/gun`
-   Health Check: `http://localhost:8080/health`

## Deployment

This relay is automatically deployed to Render via GitHub Actions when changes are pushed to the `relay/` directory.

### Setup Render Deployment

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set the following configuration:

    - **Root Directory:** `relay`
    - **Build Command:** `npm install`
    - **Start Command:** `npm start`
    - **Environment:** Node
    - **Auto-Deploy:** Yes

4. Add these secrets to your GitHub repository:
    - `RENDER_API_KEY`: Your Render API key
    - `RENDER_RELAY_SERVICE_ID`: Your Render service ID

### Using Your Relay

Once deployed, update your bookmarks app to use your relay by modifying the default peers in `bookmarks/src/gun/services/connection.js`:

```javascript
getDefaultPeers() {
    return [
        'https://your-relay-name.onrender.com/gun', // Your custom relay
        'https://gun-us.herokuapp.com/gun',          // Backup
        'https://gun-eu.herokuapp.com/gun',          // Backup
    ];
}
```

## Features

-   **Persistent Storage:** Uses radisk for data persistence
-   **Health Monitoring:** `/health` endpoint for uptime checks
-   **CORS Support:** Configured for cross-origin requests
-   **Graceful Shutdown:** Handles SIGTERM and SIGINT signals
-   **Peer Redundancy:** Connects to public relays as backup
