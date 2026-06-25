# Frappe MCP Server

A **Model Context Protocol (MCP)** Server for Frappe Framework / ERPNext, enabling AI models (like Claude) to securely interact with your Frappe instances through a standardized protocol.

Built with [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/sdk) and powered by [`frappe-js-sdk`](https://github.com/frappe/frappe-js-sdk).

## 🎯 Overview

This MCP server bridges AI models and Frappe, allowing you to:
- **Read & manipulate documents** via CRUD operations
- **Call whitelisted Python methods** on the backend
- **Manage files** (upload, download, attach)
- **Handle authentication** with multiple auth modes
- **Orchestrate workflows** (state transitions, history)
- **Generate reports & analytics** with custom filters
- **Monitor background jobs** and task queues
- **Stream real-time events** via Socket.io
- **Generate PDFs & formatted documents**
- **Bulk import/export data**

---

## ✨ Features

### Phase 1: Document Tools
- **CRUD Operations**: Create, retrieve, update, delete documents
- **Listing & Filtering**: Paginated queries with complex filters
- **Field Operations**: Get/set individual fields, rename documents
- **Single DocTypes**: Retrieve values from single-type documents
- **Document Lifecycle**: Submit and cancel documents

### Phase 2: Method Calling & Helpers
- **Generic RPC**: Call any whitelisted Python method path
- **Link Field Search**: Autocomplete search for Link fields
- **List Views**: Fetch report/list view data
- **Form Metadata**: Retrieve DocType schemas
- **Dashboard Data**: Fetch chart and number card values

### Phase 3: File Management
- **Upload Files**: Via base64 or remote URL
- **List Attachments**: View all files attached to a document
- **Download Files**: Retrieve as base64
- **Attach to Documents**: Link files to specific document fields
- **File Deletion**: Remove file records

### Phase 4: Authentication & User Management
- **Login/Logout**: Session management
- **User Info**: Profile details and permissions
- **Dynamic Credential Switching**: Change auth context on the fly
- **Permission Lookup**: Check user DocType permissions
- **Password Reset**: Trigger password reset workflows

### Phase 5: Workflow Engine
- **State Queries**: Get current workflow state
- **Allowed Actions**: List possible transitions
- **State Transitions**: Apply workflow actions
- **Audit Trail**: Retrieve workflow history logs

### Phase 6: Reporting & Analytics
- **Run Reports**: Execute Query/Script/Builder reports
- **Custom Filters**: Apply filters to report queries
- **CSV Export**: Export reports as CSV strings
- **Dashboard Charts**: Load chart data with filters
- **Number Cards**: Get values from dashboard metrics

### Phase 7: Background Jobs
- **List Jobs**: View job queue entries
- **Job Status**: Check individual job status
- **Force Execution**: Enqueue tasks immediately

### Phase 8: Advanced Features
- **Real-time Events**: Subscribe to Socket.io events
- **Publish Events**: Emit real-time events
- **Desktop Notifications**: Retrieve unread bell notifications
- **Print Formats**: Render HTML-formatted documents
- **PDF Generation**: Generate binary PDFs (returned as base64)
- **Data Import/Export**: Bulk import/export with templates
- **Email Integration**: Send emails and log communications
- **Bulk Edit**: Update multiple records at once

---

## 🔐 Authentication

The server supports multiple authentication methods:

| Method | Use Case | Config |
|--------|----------|--------|
| **API Key/Secret** | Server-to-server, highest security | `FRAPPE_API_KEY` + `FRAPPE_API_SECRET` |
| **Bearer Token** | OAuth / token-based auth | `FRAPPE_TOKEN` |
| **Username/Password** | Session cookie-based auth | `FRAPPE_USERNAME` + `FRAPPE_PASSWORD` |
| **Dynamic Switching** | Change credentials per-call | `switch_user` tool |

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Required: Your Frappe instance URL
FRAPPE_URL=https://your-instance.frappe.cloud

# Choose ONE authentication method:

# Option 1: API Key & Secret (Recommended)
FRAPPE_API_KEY=your_api_key
FRAPPE_API_SECRET=your_api_secret

# Option 2: OAuth Bearer Token
FRAPPE_TOKEN=your_bearer_token

# Option 3: Username & Password
FRAPPE_USERNAME=administrator
FRAPPE_PASSWORD=admin_password

# Optional: Logging level (debug, info, warn, error)
LOG_LEVEL=info
```

---

## 📚 Tools Reference

The server exposes **50+ tools** organized in 8 phases. Here's a quick reference:

### Document Tools (Phase 1)
- `create_document` - Create new records
- `get_document` - Fetch single document
- `update_document` - Modify existing records
- `delete_document` - Remove records
- `list_documents` - Query with filters & pagination
- `get_document_count` - Count matching records
- `get_field_value` / `set_field_value` - Field-level operations
- `rename_document` - Change document ID
- `get_single_value` - Get Single DocType fields
- `submit_document` - Submit for approval
- `cancel_document` - Cancel submitted docs

### Method Calling (Phase 2)
- `call_method` - Generic RPC to any whitelisted method
- `search_link` - Autocomplete for Link fields
- `get_list_view` - Report/list view data
- `get_form_meta` - DocType schema
- `validate_document` - Check if document exists
- `get_dashboard_data` - Dashboard metrics

### File Management (Phase 3)
- `upload_file` - Upload (base64 or URL)
- `list_attachments` - View document attachments
- `download_file` - Download as base64
- `delete_file` - Remove file records
- `attach_file_to_document` - Link files to docs

### Authentication (Phase 4)
- `login_user` - Start session
- `logout_user` - End session
- `get_current_user` - Current user info
- `reset_password` - Trigger password reset
- `get_user_info` - Full profile details
- `get_user_permissions` - DocType permissions
- `switch_user` - Change auth credentials

### Workflows (Phase 5)
- `get_workflow_state` - Current state
- `get_workflow_actions` - Allowed transitions
- `workflow_transition` - Apply action
- `get_workflow_history` - Audit trail

### Reports (Phase 6)
- `run_query_report` - Execute reports
- `get_report_columns` - Report schema
- `export_report` - Export as CSV
- `get_dashboard_chart` - Chart data
- `get_number_card` - Card metrics

### Jobs (Phase 7)
- `list_jobs` - Job queue entries
- `get_job_status` - Check job status
- `enqueue_job` - Force execution

### Advanced (Phase 8)
- `subscribe_to_events` - Listen for realtime events
- `publish_realtime_event` - Emit events
- `get_notifications` - Unread notifications
- `get_print_format` - Render HTML format
- `generate_pdf` - Generate PDF (base64)
- `import_data` - Bulk data import
- `export_data` - Bulk data export
- `download_template` - Get import template
- `send_email` - Send mail
- `create_communication` - Log email history
- `get_email_queue` - Check email status
- `get_print_settings` - System print config
- `bulk_edit` - Update multiple records

---

## 📖 Resources

MCP Resources expose Frappe data as dynamic URIs that AI models can reference and read:

| URI Pattern | Description |
|-------------|-------------|
| `schema://{doctype}` | Full DocType metadata schema |
| `schema://{doctype}/fields` | List of field definitions |
| `data://{doctype}/{name}` | Live document data |
| `report://{report_name}` | Report definition & settings |
| `workflow://{doctype}` | Workflow state transitions |
| `user://me` | Current authenticated user profile |

Example: An AI can reference `schema://Customer` to understand the Customer DocType structure before creating one.

---

## 🤖 Prompts

AI prompt templates for common workflows:

| Prompt | Arguments | Purpose |
|--------|-----------|---------|
| `create_sales_order` | customer, item_code, qty, rate | Guided sales order creation |
| `approve_purchase` | doctype, name, action | Purchase approval workflow |
| `generate_monthly_report` | report_name, fiscal_year | Monthly analytics generation |
| `onboard_new_employee` | employee_name, department, role | HR employee onboarding |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Access to a Frappe instance

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd frappe-mcp-server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Frappe instance details
```

### Development

Run the server in development mode with auto-reloading:

```bash
npm run dev
```

The server starts on the configured transport (default: SSE on port 3000).

### Build

Compile TypeScript to JavaScript for production:

```bash
npm run build
```

Output: `dist/index.js`

### Production

Run the compiled production build:

```bash
npm run start
```

---

## 🧪 Testing

### Unit Tests

Run automated tests using **Vitest**:

```bash
npm run test
```

Tests verify:
- Tool schema validation
- Input parameter checking
- Tool routing logic
- Resource templates
- Prompt builders

### Manual Testing with MCP Inspector

Use the official **MCP Inspector** to visually test tools, resources, and prompts:

#### Development Server
```bash
npx -y @modelcontextprotocol/inspector npx tsx src/index.ts
```

#### Production Build
```bash
npx -y @modelcontextprotocol/inspector node dist/index.js
```

Then open the URL (typically `http://localhost:5173`) in your browser to:
- Browse all available tools
- Call tools with test parameters
- View resources
- Preview prompts

---

## 🐳 Docker Deployment

### Quick Start

Build and run using Docker Compose:

```bash
# Set your Frappe instance URL
export FRAPPE_URL=https://your-instance.frappe.cloud

# Start the container
docker-compose up -d
```

The server runs on `http://localhost:3000` with health checks enabled.

### Docker Build

Build the image manually:

```bash
docker build -t frappe-mcp-server:latest .
```

Run:

```bash
docker run -p 3000:3000 \
  -e FRAPPE_URL=https://your-instance.frappe.cloud \
  -e LOG_LEVEL=info \
  frappe-mcp-server:latest
```

### Multi-User Mode (SSE)

The server supports multi-user SSE (Server-Sent Events) mode. Each client can:
- Connect over HTTP with credentials in headers
- Have isolated sessions via `AsyncLocalStorage`
- Dynamically switch authentication

---

## 🔧 Configuration

### MCP Transport

The server supports two MCP transports:

1. **Stdio** (default for CLI/integration)
   - Single-user, embedded mode
   - No HTTP overhead

2. **SSE** (HTTP Server-Sent Events)
   - Multi-user, client-server mode
   - Better for cloud deployments
   - Port: 3000 (configurable)

### Logging

Control verbosity with `LOG_LEVEL` environment variable:
- `debug` - Verbose debugging info
- `info` - Standard operation logs (default)
- `warn` - Warnings only
- `error` - Errors only

---

## 📁 Project Structure

```
src/
├── index.ts                 # MCP server entry point
├── config.ts                # Environment & configuration
├── core/
│   ├── frappe-client.ts    # frappe-js-sdk wrapper
│   └── error-handler.ts    # Error handling
├── tools/
│   ├── index.ts            # Tool registry & routing
│   ├── document-tools.ts   # CRUD operations
│   ├── method-tools.ts     # RPC method calling
│   ├── file-tools.ts       # File management
│   ├── auth-tools.ts       # Authentication
│   ├── workflow-tools.ts   # Workflow engine
│   ├── report-tools.ts     # Reporting
│   ├── job-tools.ts        # Background jobs
│   └── advanced-tools.ts   # Advanced features
├── resources/
│   └── index.ts            # Resource templates & reader
├── prompts/
│   └── index.ts            # AI prompt templates
├── types/
│   ├── frappe.ts           # Frappe types
│   └── index.ts
└── utils/
    └── logger.ts           # Structured logging

tests/
└── unit/
    └── tools.test.ts       # Tool tests
```

---

## 🤝 Integration

### With Claude (ChatGPT-compatible)

Configure your MCP client to connect to this server. Example for Claude Desktop:

1. Add to Claude's MCP config
2. Point to `http://localhost:3000` (SSE mode)
3. Provide authentication headers with each request

### With Other AI Models

Any MCP-compatible client can integrate by connecting to the server's stdio or SSE transport.

---

## 📝 License

MIT

---

## 🔗 Related Projects

- [frappe-js-sdk](https://github.com/frappe/frappe-js-sdk) - JavaScript SDK for Frappe
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [Frappe Framework](https://github.com/frappe/frappe) - The Frappe platform

---

## 🔌 Integration with Claude Desktop

### Remote VM Server Setup

This MCP server is designed to run on a separate VM server. To connect Claude Desktop to your remote instance:

1. **Deploy to VM** (see [Docker Deployment](#-docker-deployment) below)
2. **Configure Claude Desktop** by editing your `claude_desktop_config.json`:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

**Option 1: Using mcp-remote (with headers support)**

```json
{
  "mcpServers": {
    "frappe-mcp": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "-u",
        "http://your-vm-server.com:3000",
        "-H",
        "X-Frappe-Api-Key=your_api_key",
        "-H",
        "X-Frappe-Api-Secret=your_api_secret"
      ]
    }
  }
}
```

**Option 2: Using @modelcontextprotocol/inspector (with headers)**

```json
{
  "mcpServers": {
    "frappe-mcp": {
      "command": "sh",
      "args": [
        "-c",
        "curl -N http://your-vm-server.com:3000 -H 'X-Frappe-Api-Key: your_api_key' -H 'X-Frappe-Api-Secret: your_api_secret'"
      ]
    }
  }
}
```

> [!IMPORTANT]
> Replace:
> - `http://your-vm-server.com:3000` with your actual VM server URL
> - `your_api_key` and `your_api_secret` with your Frappe API credentials
> - Restart Claude Desktop after configuration changes

---

## 🐳 Docker Deployment

The project includes a multi-stage `Dockerfile` and `docker-compose.yml` to compile and containerize the server for VM deployment.

### Build & Deploy to VM

1. **Build the Docker image**:
```bash
docker build -t frappe-mcp-server:latest .
```

2. **Push to Docker registry** (e.g., Docker Hub, private registry):
```bash
docker tag frappe-mcp-server:latest your-registry/frappe-mcp-server:latest
docker push your-registry/frappe-mcp-server:latest
```

3. **On the VM, pull and run**:
```bash
docker pull your-registry/frappe-mcp-server:latest
docker run -d \
  --name frappe-mcp \
  -p 3000:3000 \
  -e FRAPPE_URL=https://your-frappe-instance.frappe.cloud \
  -e LOG_LEVEL=info \
  your-registry/frappe-mcp-server:latest
```

> [!NOTE]
> **No credentials in environment variables**: Credentials are passed per-connection via HTTP headers by the client. The server supports two header formats:
> - **Recommended**: `X-Frappe-Api-Key` + `X-Frappe-Api-Secret` headers
> - **Alternative**: `Authorization: token API_KEY:API_SECRET` header
>
> Only the `FRAPPE_URL` needs to be set as an environment variable on the VM.

### Using Docker Compose on VM

```bash
# On your local machine, copy docker-compose.yml to your VM:
scp docker-compose.yml user@your-vm:/home/user/

# SSH into VM
ssh user@your-vm

# Set environment variables (only FRAPPE_URL, no credentials needed)
export FRAPPE_URL=https://your-frappe-instance.frappe.cloud

# Start the service
docker-compose up -d
```

The compose config will expose port 3000 and automatically handle health checks. Clients connect via HTTP headers with their credentials.

---

## 🔐 Authentication Flow

### Environment Variables (Server-level)
- `FRAPPE_URL` - **Required**: Your Frappe instance URL
- `FRAPPE_API_KEY` / `FRAPPE_API_SECRET` - Optional, only needed if no credentials in headers
- `LOG_LEVEL` - Optional, logging verbosity

### Request Headers (Client-level, per-connection)
The client sends credentials in one of two formats:

**Option 1: Recommended**
```
X-Frappe-Api-Key: your_api_key
X-Frappe-Api-Secret: your_api_secret
```

**Option 2: Standard Bearer Token**
```
Authorization: token your_api_key:your_api_secret
```

This enables **multi-user SSE mode** where each client connection has isolated authentication.
