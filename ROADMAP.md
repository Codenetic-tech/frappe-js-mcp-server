# ROADMAP: Building a Brand New Frappe MCP Server from Scratch
## Using frappe-js-sdk as the Core Engine

---

## PHASE 0: FOUNDATION & SETUP (Week 1)

### Day 1-2: Project Scaffolding
```
frappe-mcp-server-v2/
├── src/
│   ├── index.ts                    # Entry point, MCP server initialization
│   ├── config.ts                   # Environment variables & validation
│   ├── types/
│   │   ├── frappe.ts               # Frappe-specific types (DocType, filters, etc.)
│   │   ├── mcp.ts                  # MCP tool/resource/prompt types
│   │   └── index.ts                # Re-exports
│   ├── core/
│   │   ├── frappe-client.ts        # frappe-js-sdk wrapper & initialization
│   │   ├── auth-manager.ts         # Authentication (cookie/token/API key)
│   │   └── error-handler.ts        # Centralized error handling
│   ├── tools/
│   │   ├── index.ts                # Tool registration & routing
│   │   ├── document-tools.ts       # CRUD operations (from SDK DB module)
│   │   ├── method-tools.ts         # Generic method caller (from SDK Call module)
│   │   ├── file-tools.ts           # File upload/download (from SDK File module)
│   │   ├── auth-tools.ts           # Login/logout/user (from SDK Auth module)
│   │   ├── workflow-tools.ts       # Workflow state transitions
│   │   ├── report-tools.ts         # Report execution
│   │   ├── job-tools.ts            # Background job management
│   │   └── search-tools.ts         # Search & link field search
│   ├── resources/
│   │   ├── index.ts                # Resource registration
│   │   ├── schema-resources.ts     # DocType schemas
│   │   └── data-resources.ts       # Live document data
│   ├── prompts/
│   │   └── index.ts                # MCP prompts (templates for AI)
│   └── utils/
│       ├── validators.ts           # Input validation helpers
│       ├── formatters.ts           # Response formatting
│       └── logger.ts               # Structured logging
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── static_hints/                   # Enhanced usage hints (from v1)
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── package.json
├── tsconfig.json
├── tsup.config.ts                  # Build config
└── README.md
```

### Day 3-4: Core Infrastructure
1. **Initialize frappe-js-sdk client**
   - Support all auth modes: API key/secret, cookie-based, OAuth Bearer token
   - Auto-retry with exponential backoff
   - Connection pooling
   
2. **MCP Server Setup**
   - Use `@modelcontextprotocol/sdk` for server implementation
   - Support both stdio and SSE transports
   - Health check endpoint
   
3. **Error Handling**
   - Map Frappe HTTP errors → MCP error codes
   - Structured error responses with context
   - Retry logic for transient failures

### Day 5-7: Tool Registration Framework
- Dynamic tool discovery system
- Tool schema generation from TypeScript types
- Input validation pipeline
- Response formatting pipeline

---

## PHASE 1: CORE DOCUMENT TOOLS (Week 2)

### Tools to Implement (SDK DB Module)

| Tool Name | SDK Method | Priority |
|-----------|-----------|----------|
| `create_document` | `db.createDoc()` | P0 |
| `get_document` | `db.getDoc()` | P0 |
| `update_document` | `db.updateDoc()` | P0 |
| `delete_document` | `db.deleteDoc()` | P0 |
| `list_documents` | `db.getDocList()` | P0 |
| `get_document_count` | `db.getCount()` | P0 |
| `rename_document` | `db.renameDoc()` | P1 |
| `get_field_value` | `db.getValue()` | P1 |
| `set_field_value` | `db.setValue()` | P1 |
| `get_single_value` | `db.getSingleValue()` | P1 |
| `submit_document` | `db.submit()` | P1 |
| `cancel_document` | `db.cancel()` | P1 |

### Key Features:
- Auto-resolve Link fields (fetch linked document details)
- Handle child tables automatically
- Support for `asDict` mode
- Pagination with cursor-based navigation
- Field-level permission checking

---

## PHASE 2: GENERIC METHOD CALLER (Week 3)

### Tool: `call_method`

This is the **most powerful tool** — it unlocks every whitelisted Frappe method.

```typescript
// Tool Definition
{
  name: "call_method",
  description: "Call any whitelisted Frappe/ERPNext method",
  inputSchema: {
    type: "object",
    properties: {
      method: { type: "string", description: "Dotted path to method (e.g., frappe.client.get_value)" },
      params: { type: "object", description: "Method parameters" },
      httpMethod: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"], default: "POST" }
    },
    required: ["method"]
  }
}
```

### Pre-built Method Wrappers
Create convenience tools for commonly used methods:

| Tool | Underlying Method | Use Case |
|------|------------------|----------|
| `search_link` | `frappe.desk.search_link` | Link field autocomplete |
| `get_list_view` | `frappe.desk.reportview.get` | List view data |
| `get_form_meta` | `frappe.desk.form.load.getdoc` | Form metadata |
| `validate_document` | `frappe.client.validate_link` | Validate links |
| `get_dashboard_data` | `frappe.desk.doctype.dashboard_chart.dashboard_chart.get` | Chart data |

---

## PHASE 3: FILE MANAGEMENT (Week 3-4)

### Tools to Implement (SDK File Module)

| Tool Name | SDK Method | Description |
|-----------|-----------|-------------|
| `upload_file` | `file.uploadFile()` | Upload with progress tracking |
| `list_attachments` | Custom API call | List files for a document |
| `download_file` | Custom API call | Download file content |
| `delete_file` | Custom API call | Delete file from Frappe |
| `attach_file_to_document` | `file.uploadFile()` with doctype/docname | Attach to specific doc |

### Features:
- Base64 encoding for MCP transport
- Progress reporting (if SSE transport)
- Private vs public file handling
- Folder management
- Image thumbnail generation

---

## PHASE 4: AUTHENTICATION & USER MANAGEMENT (Week 4)

### Tools to Implement (SDK Auth Module)

| Tool Name | SDK Method | Description |
|-----------|-----------|-------------|
| `login_user` | `auth.loginWithUsernamePassword()` | Cookie-based login |
| `logout_user` | `auth.logout()` | End session |
| `get_current_user` | `auth.getLoggedInUser()` | Current user info |
| `reset_password` | `auth.forgetPassword()` | Send reset email |
| `get_user_info` | Custom API call | Full user profile |
| `get_user_permissions` | Custom API call | DocType permissions |
| `switch_user` | Re-init SDK | Multi-user support |

### Multi-Auth Support:
```typescript
// Config options
interface AuthConfig {
  type: 'api_key' | 'cookie' | 'oauth' | 'password';
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  token?: string;
  tokenType?: 'Bearer' | 'token';
}
```

---

## PHASE 5: WORKFLOW ENGINE (Week 5)

### Tools to Implement

| Tool Name | Description |
|-----------|-------------|
| `get_workflow_state` | Get current state + allowed transitions |
| `get_workflow_actions` | List possible actions for current state |
| `workflow_transition` | Perform state transition |
| `get_workflow_history` | Get audit trail of state changes |
| `batch_workflow_transition` | Bulk workflow actions |

### Integration:
- Auto-check workflow before document updates
- Suggest valid actions in tool descriptions
- Handle mandatory fields per workflow state

---

## PHASE 6: REPORTING & ANALYTICS (Week 6)

### Tools to Implement

| Tool Name | Description |
|-----------|-------------|
| `run_query_report` | Execute Query Reports with filters |
| `run_script_report` | Execute Script Reports |
| `get_report_columns` | Get report schema/columns |
| `export_report` | Export to CSV/Excel |
| `get_dashboard_chart` | Get chart data for dashboards |
| `get_number_card` | Get number card values |

### Report Types Supported:
1. **Query Report** — SQL-based, filterable
2. **Script Report** — Python-based, complex logic
3. **Report Builder** — No-code reports

---

## PHASE 7: BACKGROUND JOBS (Week 7)

### Tools to Implement

| Tool Name | Description |
|-----------|-------------|
| `enqueue_job` | Submit job to RQ queue |
| `get_job_status` | Check job status |
| `get_job_result` | Get completed job output |
| `list_jobs` | List jobs with filters |
| `cancel_job` | Cancel pending job |
| `retry_job` | Retry failed job |

### Queue Support:
- `short` (default)
- `long`
- `default`
- Custom queues

---

## PHASE 8: ADVANCED FEATURES (Week 8-10)

### 8.1 Real-Time Events
| Tool | Description |
|------|-------------|
| `subscribe_to_events` | Subscribe to Socket.io events |
| `publish_realtime_event` | Publish real-time event |
| `get_notifications` | Get unread notifications |

### 8.2 Print & PDF
| Tool | Description |
|------|-------------|
| `get_print_format` | Get HTML print format |
| `generate_pdf` | Generate PDF (v16 Chrome-based) |
| `get_print_settings` | Get print settings |

### 8.3 Data Import/Export
| Tool | Description |
|------|-------------|
| `import_data` | Import from CSV/Excel |
| `export_data` | Export to CSV/Excel |
| `download_template` | Get import template |
| `bulk_edit` | Bulk update documents |

### 8.4 Communication
| Tool | Description |
|------|-------------|
| `send_email` | Send email via Frappe |
| `create_communication` | Log communication |
| `get_email_queue` | Check email queue status |

---

## PHASE 9: RESOURCES & PROMPTS (Week 10-11)

### Resources (MCP Resource Protocol)
| Resource URI | Description |
|-------------|-------------|
| `schema://{doctype}` | DocType schema |
| `schema://{doctype}/fields` | Field definitions |
| `data://{doctype}/{name}` | Live document data |
| `report://{report_name}` | Report definition |
| `workflow://{doctype}` | Workflow definition |
| `user://me` | Current user info |

### Prompts (MCP Prompt Protocol)
| Prompt | Description |
|--------|-------------|
| `create_sales_order` | Template for creating Sales Order |
| `approve_purchase` | Template for purchase approval workflow |
| `generate_monthly_report` | Template for monthly analytics |
| `onboard_new_employee` | Template for HR onboarding |

---

## PHASE 10: TESTING & DEPLOYMENT (Week 12)

### Testing Strategy
1. **Unit Tests** — Mock frappe-js-sdk, test tool logic
2. **Integration Tests** — Test against live Frappe instance
3. **E2E Tests** — Full MCP client → Server → Frappe flow
4. **Performance Tests** — Load testing with concurrent requests

### Deployment
1. **Docker** — Multi-stage build, minimal image
2. **Docker Compose** — With Redis for caching
3. **Portainer** — Stack deployment guide
4. **Cloud** — Railway, Render, Fly.io configs
5. **Multi-tenant Gateway** — Dynamic credentials per request

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.x |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Frappe Client | `frappe-js-sdk` |
| HTTP Client | Axios (via SDK) |
| Build | `tsup` |
| Testing | Vitest |
| Linting | ESLint + Prettier |
| Logging | Pino |
| Validation | Zod |
| Caching | Node-cache / Redis |

---

## KEY DESIGN PRINCIPLES

1. **SDK-First** — Let frappe-js-sdk handle all HTTP complexity
2. **Type Safety** — Full TypeScript, Zod validation
3. **Graceful Degradation** — Handle missing permissions, network issues
4. **Observability** — Structured logging, metrics, tracing
5. **Extensibility** — Plugin architecture for custom tools
6. **Performance** — Connection pooling, caching, batching

---

## ESTIMATED TIMELINE

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Foundation | 1 week | 1 week |
| Phase 1: Core Documents | 1 week | 2 weeks |
| Phase 2: Method Caller | 1 week | 3 weeks |
| Phase 3: File Management | 1 week | 4 weeks |
| Phase 4: Auth & Users | 1 week | 5 weeks |
| Phase 5: Workflow | 1 week | 6 weeks |
| Phase 6: Reporting | 1 week | 7 weeks |
| Phase 7: Background Jobs | 1 week | 8 weeks |
| Phase 8: Advanced | 3 weeks | 11 weeks |
| Phase 9: Resources/Prompts | 2 weeks | 13 weeks |
| Phase 10: Testing & Deploy | 1 week | 14 weeks |

**Total: ~3.5 months for full-featured v1.0**

**MVP (Phases 0-3): ~1 month**
