# Frappe MCP Server (Full Roadmap Implementation)

A Model Context Protocol (MCP) Server for the Frappe Framework / ERPNext, built using the `@modelcontextprotocol/sdk` and powered by the `frappe-js-sdk` client.

This server enables AI models (like Claude) to securely interact with your Frappe instances, perform document CRUD, execute whitelisted python RPC methods, upload/download files, manage workflows, run query/script reports, check background job queues, listen to realtime socket events, and generate PDFs.

---

## 📂 Features Checklist

*   **Phase 1: Document Tools**: Create, retrieve, update, delete, paginated listing, counting, field-level get/set, document renaming, single DocTypes, and document submit/cancel actions.
*   **Phase 2: RPC Method Calling**: Call any whitelisted method path, with optimized wrappers for search autocomplete link fields, report list views, and form schemas.
*   **Phase 3: File Manager**: File uploads (via base64 or remote URL downloads), listing attachments, downloading files (retrieved as base64), and file record deletion.
*   **Phase 4: Auth & Session Swapping**: Session login/logout, profile checks, permission lookups, and dynamic credentials swapping (`switch_user`).
*   **Phase 5: Workflow Engine**: Document workflow state queries, action list queries, applying workflow transitions, and retrieving workflow log history.
*   **Phase 6: Reporting & Analytics**: Running Query/Script reports with custom filters, exporting reports directly to CSV strings, and retrieving dashboard charts or number card values.
*   **Phase 7: Background Jobs**: Checking job queues, listing job log entries, and forcing enqueued task execution.
*   **Phase 8: Advanced Integrations**: Listening to Socket.io realtime events (emitted to stderr logs), publishing realtime events, retrieving unread bell notifications, rendering HTML print formats, generating binary PDFs (returned as base64), batch bulk edits, enqueuing data imports/exports, downloading templates, and mailing/logging emails.
*   **Phase 9: MCP Resource & Prompt Protocols**:
    *   **Resources**: Dynamic URIs like `schema://{doctype}`, `schema://{doctype}/fields`, `data://{doctype}/{name}`, `report://{report_name}`, `workflow://{doctype}`, and `user://me`.
    *   **Prompts**: Ready-to-use AI templates for Sales Orders, approvals, monthly reports, and employee onboarding.

---

## ⚙️ Configuration

Create a `.env` file in the root directory (refer to `.env.example`):

```env
# Frappe Server URL (required)
FRAPPE_URL=https://your-frappe-instance.frappe.cloud

# --- Authentication Choices (Pick ONE) ---

# Choice A: API Key & Secret (Recommended for servers/backends)
FRAPPE_API_KEY=your_api_key
FRAPPE_API_SECRET=your_api_secret

# Choice B: OAuth Bearer Token
FRAPPE_TOKEN=your_token
FRAPPE_TOKEN_TYPE=Bearer

# Choice C: Username & Password (Session cookie)
FRAPPE_USERNAME=administrator
FRAPPE_PASSWORD=admin_password

# --- Logging ---
# log levels: debug, info, warn, error
LOG_LEVEL=info
```

---

## 🚀 Commands

To run in development mode (auto-rebuilding):
```bash
npm run dev
```

To compile and bundle for production (outputs to `dist/index.js`):
```bash
npm run build
```

To run the unit test suite:
```bash
npm run test
```

To run the compiled production bundle:
```bash
npm run start
```

---

## 🧪 How to Test

### 1. Run Automated Unit Tests
We use **Vitest** to run tests that mock the SDK calls to verify tool schemas, input parameter validation, routing, resource templates, and prompt builders:
```bash
npm run test
```

### 2. Test Manually with MCP Inspector (Recommended)
You can visually interact with the server, list resources, view prompts, and run tools using the official **MCP Inspector** tool.

To run the inspector on the dev server:
```bash
npx -y @modelcontextprotocol/inspector npx tsx src/index.ts
```

To run the inspector on the compiled production build:
```bash
npx -y @modelcontextprotocol/inspector node dist/index.js
```

This will output an URL (typically `http://localhost:5173`) that you can open in your browser to test calling all the tools (like `list_documents` or `call_method`) with mock or real inputs.

---

## 🔌 Integration with Claude Desktop

To connect this server to your Claude Desktop application, edit your `claude_desktop_config.json` (located at `%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "frappe-mcp": {
      "command": "node",
      "args": [
        "F:/MCP/frappe js mcp/dist/index.js"
      ],
      "env": {
        "FRAPPE_URL": "https://your-frappe-instance.frappe.cloud",
        "FRAPPE_API_KEY": "your_api_key",
        "FRAPPE_API_SECRET": "your_api_secret",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

> [!IMPORTANT]
> - Ensure you run `npm run build` inside `F:/MCP/frappe js mcp` first so that `dist/index.js` exists.
> - Replace `"F:/MCP/frappe js mcp/dist/index.js"` with the absolute path of your workspace.
> - Restart Claude Desktop after making configuration changes.

---

## 🐳 Docker Deployment

The project includes a multi-stage `Dockerfile` and `docker-compose.yml` to compile and containerize the server.

To build the image and run it in a container:
```bash
docker compose -f docker/docker-compose.yml up --build -d
```
The compose config maps environment variables directly into the service.
