# Penpot MCP Server Setup & Troubleshooting

## Prerequisites

- Node.js 18+
- A running Penpot instance (cloud or self-hosted)
- A modern browser (Firefox recommended for fewest localhost issues)

## Full Installation

```bash
# 1. Clone the MCP server
git clone https://github.com/penpot/penpot-mcp.git
cd penpot-mcp

# 2. Install dependencies
npm install

# 3. Build and start all servers (plugin + MCP bridge)
npm run bootstrap
```

This starts three services:

| Port | Service | Purpose |
| ---- | ------- | ------- |
| 4400 | Plugin server | Serves the Penpot plugin manifest and UI |
| 4401 | SSE server | MCP transport (VS Code connects here) |
| 4402 | WebSocket | Internal communication plugin ↔ MCP |

## Connecting Penpot Plugin

1. Open a design file in Penpot
2. Go to **Plugins** → **Plugin Manager** → **Load plugin from URL**
3. Enter: `http://localhost:4400/manifest.json`
4. The plugin panel opens — click **"Connect to MCP server"**
5. Status should show **"Connected"**

## VS Code Configuration

Add to your VS Code `settings.json` (user or workspace):

```json
{
  "mcp": {
    "servers": {
      "penpot": {
        "url": "http://localhost:4401/sse"
      }
    }
  }
}
```

Restart VS Code after adding the configuration.

## Troubleshooting

### Server Won't Start

| Symptom | Fix |
| ------- | --- |
| Port already in use | Kill existing process: `lsof -ti:4400 \| xargs kill` |
| npm install fails | Delete `node_modules` and `package-lock.json`, retry |
| Build errors | Ensure Node.js 18+ (`node --version`) |

### Plugin Connection Issues

| Symptom | Fix |
| ------- | --- |
| Plugin won't load | Verify `http://localhost:4400/manifest.json` is accessible in browser |
| "WebSocket connection failed" | Check firewall allows ports 4400, 4401, 4402 |
| Browser blocks localhost | Allow local network access prompt; disable Brave Shield; try Firefox |
| Plugin shows "Disconnected" | Restart servers: `npm run start:all` in penpot-mcp directory |

### VS Code / Claude Desktop Issues

| Symptom | Fix |
| ------- | --- |
| Tools not appearing | Restart VS Code completely after config changes |
| Tool execution times out | Ensure Penpot plugin UI is open and shows "Connected" |
| SSE connection refused | Verify `http://localhost:4401/sse` responds in browser |
| "Server not found" | Check `settings.json` syntax — no trailing commas |

### Verifying Everything Works

```bash
# Check servers are running
curl -s http://localhost:4400/manifest.json | head -5
curl -s http://localhost:4401/sse  # Should establish SSE connection

# In VS Code, try:
# mcp__penpot__penpot_api_info
# Should return API documentation without errors
```
