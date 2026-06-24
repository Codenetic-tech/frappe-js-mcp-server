import { Tool, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import * as docTools from "./document-tools.js";
import * as methodTools from "./method-tools.js";
import * as fileTools from "./file-tools.js";
import * as authTools from "./auth-tools.js";
import * as workflowTools from "./workflow-tools.js";
import * as reportTools from "./report-tools.js";
import * as jobTools from "./job-tools.js";
import * as advancedTools from "./advanced-tools.js";

export const TOOLS: Tool[] = [
  // ==========================================
  // PHASE 1: CORE DOCUMENT TOOLS
  // ==========================================
  {
    name: "create_document",
    description: "Create a new document in the Frappe database.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType (e.g., 'Customer', 'Task')" },
        document: { type: "object", description: "The field values for the new document" },
      },
      required: ["doctype", "document"],
    },
  },
  {
    name: "get_document",
    description: "Retrieve a single document from the Frappe database by its name/ID.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        name: { type: "string", description: "The name/ID of the document" },
      },
      required: ["doctype", "name"],
    },
  },
  {
    name: "update_document",
    description: "Update fields of an existing document in the Frappe database.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        name: { type: "string", description: "The name/ID of the document to update" },
        document: { type: "object", description: "The fields and updated values" },
      },
      required: ["doctype", "name", "document"],
    },
  },
  {
    name: "delete_document",
    description: "Delete a document from the Frappe database by name.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        name: { type: "string", description: "The name/ID of the document to delete" },
      },
      required: ["doctype", "name"],
    },
  },
  {
    name: "list_documents",
    description: "Fetch a list of documents from a DocType, matching filter conditions.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "List of fields to fetch. Defaults to name.",
        },
        filters: {
          type: "array",
          description: "Filters list. Format: [['field', 'operator', 'value']] (e.g. [['status', '=', 'Open']])",
        },
        orFilters: {
          type: "array",
          description: "Or filters list. Same format as filters.",
        },
        limit_start: { type: "integer", description: "Offset index for pagination" },
        limit: { type: "integer", description: "Number of rows to fetch (default: 20)" },
        orderBy: {
          type: "object",
          properties: {
            field: { type: "string" },
            order: { type: "string", enum: ["asc", "desc"] },
          },
          required: ["field", "order"],
          description: "Ordering by field and direction",
        },
        asDict: { type: "boolean", description: "Whether to return results as objects" },
      },
      required: ["doctype"],
    },
  },
  {
    name: "get_document_count",
    description: "Count the number of documents in a DocType matching filters.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        filters: { type: "array", description: "Filters list format: [['field', 'operator', 'value']]" },
      },
      required: ["doctype"],
    },
  },
  {
    name: "get_field_value",
    description: "Fetch a single field value of a document based on filters.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        filters: {
          type: "any",
          description: "Document name string OR query filter array e.g., [['status', '=', 'Open']]",
        },
        fieldname: { type: "string", description: "Field name to fetch value for" },
      },
      required: ["doctype", "filters", "fieldname"],
    },
  },
  {
    name: "set_field_value",
    description: "Update a single field value of a document by name.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        name: { type: "string", description: "The name/ID of the document" },
        fieldname: { type: "string", description: "Field name to modify" },
        value: { type: "any", description: "The new value to assign" },
      },
      required: ["doctype", "name", "fieldname", "value"],
    },
  },
  {
    name: "rename_document",
    description: "Rename a document key/ID in the database.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        old_name: { type: "string", description: "Current document name" },
        new_name: { type: "string", description: "New document name to assign" },
        merge: { type: "boolean", description: "Merge records if new name already exists" },
      },
      required: ["doctype", "old_name", "new_name"],
    },
  },
  {
    name: "get_single_value",
    description: "Get value of a field from a Single DocType.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The Single DocType" },
        fieldname: { type: "string", description: "Target field name" },
      },
      required: ["doctype", "fieldname"],
    },
  },
  {
    name: "submit_document",
    description: "Submit a document to the database (sets docstatus to 1).",
    inputSchema: {
      type: "object",
      properties: {
        document: { type: "object", description: "The full document object including doctype and name" },
      },
      required: ["document"],
    },
  },
  {
    name: "cancel_document",
    description: "Cancel a submitted document in the database (sets docstatus to 2).",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        name: { type: "string", description: "The name/ID of the document to cancel" },
      },
      required: ["doctype", "name"],
    },
  },

  // ==========================================
  // PHASE 2: GENERIC METHOD CALLER & WRAPPERS
  // ==========================================
  {
    name: "call_method",
    description: "Call any whitelisted Python method on the Frappe/ERPNext backend.",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", description: "Dotted path to method (e.g., 'frappe.client.get_value')" },
        params: { type: "object", description: "Optional method parameters" },
        httpMethod: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE"],
          default: "POST",
          description: "HTTP method to use",
        },
      },
      required: ["method"],
    },
  },
  {
    name: "search_link",
    description: "Autocomplete search helper for Link fields.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The Link target DocType" },
        txt: { type: "string", description: "Search query string" },
        filters: { type: "any", description: "Additional filters to apply" },
        reference_doctype: { type: "string", description: "The referencing DocType context" },
      },
      required: ["doctype"],
    },
  },
  {
    name: "get_list_view",
    description: "Retrieve report/list view data using standard ReportView logic.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
        fields: { type: "array", items: { type: "string" } },
        filters: { type: "any" },
        order_by: { type: "string", description: "e.g., 'creation desc'" },
        start: { type: "integer" },
        page_length: { type: "integer" },
      },
      required: ["doctype"],
    },
  },
  {
    name: "get_form_meta",
    description: "Retrieve Form schema metadata for a DocType.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "The target DocType" },
      },
      required: ["doctype"],
    },
  },
  {
    name: "validate_document",
    description: "Validate if a document link references a valid existing document.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "Linked DocType" },
        docname: { type: "string", description: "Linked Document name" },
      },
      required: ["doctype", "docname"],
    },
  },
  {
    name: "get_dashboard_data",
    description: "Fetch analytics chart details from a Dashboard Chart.",
    inputSchema: {
      type: "object",
      properties: {
        chart_name: { type: "string", description: "The Dashboard Chart name" },
      },
      required: ["chart_name"],
    },
  },

  // ==========================================
  // PHASE 3: FILE MANAGEMENT
  // ==========================================
  {
    name: "upload_file",
    description: "Upload a file to the Frappe file manager.",
    inputSchema: {
      type: "object",
      properties: {
        file_name: { type: "string", description: "Name of the file to save as" },
        content_base64: { type: "string", description: "Base64-encoded string of file content" },
        file_url: { type: "string", description: "Direct URL of file if uploading via remote URL" },
        doctype: { type: "string", description: "Optional DocType to link this file to" },
        docname: { type: "string", description: "Optional Document Name to link this file to" },
        fieldname: { type: "string", description: "Optional Fieldname in target document to attach URL" },
        is_private: { type: "boolean", description: "Set true to restrict file visibility" },
        folder: { type: "string", description: "Destination folder path (default: Home)" },
      },
      required: ["file_name"],
    },
  },
  {
    name: "list_attachments",
    description: "List all files attached to a specific document.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "Target document DocType" },
        docname: { type: "string", description: "Target document name" },
      },
      required: ["doctype", "docname"],
    },
  },
  {
    name: "download_file",
    description: "Download a file and return its content as base64.",
    inputSchema: {
      type: "object",
      properties: {
        file_url: { type: "string", description: "Relative or absolute URL of the file to download" },
      },
      required: ["file_url"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file record from Frappe.",
    inputSchema: {
      type: "object",
      properties: {
        file_name: { type: "string", description: "Name/ID of the File document" },
      },
      required: ["file_name"],
    },
  },
  {
    name: "attach_file_to_document",
    description: "Attach an existing file or download URL to a specific document field.",
    inputSchema: {
      type: "object",
      properties: {
        file_name: { type: "string", description: "File name" },
        doctype: { type: "string", description: "DocType to link to" },
        docname: { type: "string", description: "Document name to link to" },
        content_base64: { type: "string", description: "Base64 encoded content" },
        file_url: { type: "string", description: "Remote URL of the file" },
        fieldname: { type: "string", description: "Target attachment fieldname" },
        is_private: { type: "boolean", description: "Is file private" },
      },
      required: ["file_name", "doctype", "docname"],
    },
  },

  // ==========================================
  // PHASE 4: AUTHENTICATION & USER MANAGEMENT
  // ==========================================
  {
    name: "login_user",
    description: "Establish a session for a user using email and password.",
    inputSchema: {
      type: "object",
      properties: {
        usr: { type: "string", description: "User email or username" },
        pwd: { type: "string", description: "User password" },
      },
      required: ["usr", "pwd"],
    },
  },
  {
    name: "logout_user",
    description: "Terminate the current authenticated session.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_current_user",
    description: "Retrieve username/email of the logged-in user.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "reset_password",
    description: "Send password reset request email to a user.",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", description: "User email address" },
      },
      required: ["username"],
    },
  },
  {
    name: "get_user_info",
    description: "Get full User profile details.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "User email address" },
      },
      required: ["email"],
    },
  },
  {
    name: "get_user_permissions",
    description: "Retrieve allowed DocType permissions for a user.",
    inputSchema: {
      type: "object",
      properties: {
        user: { type: "string", description: "Target user email" },
        doctype: { type: "string", description: "Filter by DocType" },
      },
      required: ["user"],
    },
  },
  {
    name: "switch_user",
    description: "Re-initialize the client session with new authentication credentials dynamically.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["api_key", "cookie", "oauth", "password"],
          description: "Auth mode type to switch to",
        },
        apiKey: { type: "string" },
        apiSecret: { type: "string" },
        username: { type: "string" },
        password: { type: "string" },
        token: { type: "string" },
        tokenType: { type: "string", enum: ["Bearer", "token"], default: "Bearer" },
      },
      required: ["type"],
    },
  },

  // ==========================================
  // PHASE 5: WORKFLOW ENGINE
  // ==========================================
  {
    name: "get_workflow_state",
    description: "Get the current workflow state and allowed transitions for a document.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "DocType name" },
        name: { type: "string", description: "Document name" },
      },
      required: ["doctype", "name"],
    },
  },
  {
    name: "get_workflow_actions",
    description: "List possible actions for the current state of a document.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "DocType name" },
        name: { type: "string", description: "Document name" },
      },
      required: ["doctype", "name"],
    },
  },
  {
    name: "workflow_transition",
    description: "Perform workflow action state transition on a document.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "DocType name" },
        name: { type: "string", description: "Document name" },
        action: { type: "string", description: "The transition action key (e.g. 'Approve', 'Reject')" },
      },
      required: ["doctype", "name", "action"],
    },
  },
  {
    name: "get_workflow_history",
    description: "Audit trail history log of workflow actions for a document.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "DocType name" },
        name: { type: "string", description: "Document name" },
      },
      required: ["doctype", "name"],
    },
  },

  // ==========================================
  // PHASE 6: REPORTING & ANALYTICS
  // ==========================================
  {
    name: "run_query_report",
    description: "Execute a report (Query / Script / Builder) by name.",
    inputSchema: {
      type: "object",
      properties: {
        report_name: { type: "string", description: "The Report name" },
        filters: { type: "object", description: "Key-value pair filters" },
      },
      required: ["report_name"],
    },
  },
  {
    name: "get_report_columns",
    description: "Retrieve columns definition structure for a report.",
    inputSchema: {
      type: "object",
      properties: {
        report_name: { type: "string" },
      },
      required: ["report_name"],
    },
  },
  {
    name: "export_report",
    description: "Run and export a report as a CSV string.",
    inputSchema: {
      type: "object",
      properties: {
        report_name: { type: "string" },
        filters: { type: "object" },
      },
      required: ["report_name"],
    },
  },
  {
    name: "get_dashboard_chart",
    description: "Load data points for a Dashboard Chart.",
    inputSchema: {
      type: "object",
      properties: {
        chart_name: { type: "string" },
        filters: { type: "object" },
      },
      required: ["chart_name"],
    },
  },
  {
    name: "get_number_card",
    description: "Get value results from a Dashboard Number Card.",
    inputSchema: {
      type: "object",
      properties: {
        docname: { type: "string", description: "Number Card name" },
        filters: { type: "object" },
      },
      required: ["docname"],
    },
  },

  // ==========================================
  // PHASE 7: BACKGROUND JOBS
  // ==========================================
  {
    name: "list_jobs",
    description: "List scheduled logs and task entries.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        filters: { type: "array" },
      },
    },
  },
  {
    name: "get_job_status",
    description: "Retrieve status of a background job log.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
      },
      required: ["job_id"],
    },
  },
  {
    name: "enqueue_job",
    description: "Force execute a scheduled job immediately on the backend.",
    inputSchema: {
      type: "object",
      properties: {
        scheduled_job_type: { type: "string", description: "The Scheduled Job Type name" },
      },
      required: ["scheduled_job_type"],
    },
  },

  // ==========================================
  // PHASE 8: ADVANCED FEATURES
  // ==========================================
  {
    name: "subscribe_to_events",
    description: "Subscribe to and listen for Socket.io events.",
    inputSchema: {
      type: "object",
      properties: {
        event_name: { type: "string", description: "Event to listen to (e.g. 'doc_update')" },
        room: { type: "string", description: "Optional room path (e.g., 'DocType/name')" },
      },
      required: ["event_name"],
    },
  },
  {
    name: "publish_realtime_event",
    description: "Publish a real-time event to the Frappe backend socket layer.",
    inputSchema: {
      type: "object",
      properties: {
        event: { type: "string" },
        message: { type: "any" },
        user: { type: "string" },
        doctype: { type: "string" },
        docname: { type: "string" },
      },
      required: ["event", "message"],
    },
  },
  {
    name: "get_notifications",
    description: "Get unread desktop/bell notification logs.",
    inputSchema: {
      type: "object",
      properties: {
        user: { type: "string", description: "User email address" },
        limit: { type: "integer" },
      },
      required: ["user"],
    },
  },
  {
    name: "get_print_format",
    description: "Load HTML rendered print format of a document.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string" },
        name: { type: "string" },
        print_format: { type: "string" },
        no_letterhead: { type: "boolean" },
      },
      required: ["doctype", "name", "print_format"],
    },
  },
  {
    name: "generate_pdf",
    description: "Generate PDF of a document and return base64.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string" },
        name: { type: "string" },
        print_format: { type: "string" },
        no_letterhead: { type: "boolean" },
      },
      required: ["doctype", "name", "print_format"],
    },
  },
  {
    name: "import_data",
    description: "Create and execute a Data Import.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string" },
        file_name: { type: "string", description: "Name of the File record containing CSV/Excel" },
        submit_after_import: { type: "boolean" },
      },
      required: ["doctype", "file_name"],
    },
  },
  {
    name: "export_data",
    description: "Trigger a standard Data Export.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string" },
        filters: { type: "array" },
        fields: { type: "array", items: { type: "string" } },
      },
      required: ["doctype"],
    },
  },
  {
    name: "download_template",
    description: "Download a data import template file as base64.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string" },
      },
      required: ["doctype"],
    },
  },
  {
    name: "send_email",
    description: "Send email directly via Frappe's mail client.",
    inputSchema: {
      type: "object",
      properties: {
        recipients: { type: "array", items: { type: "string" } },
        subject: { type: "string" },
        content: { type: "string", description: "HTML/Text content" },
        doctype: { type: "string" },
        name: { type: "string" },
      },
      required: ["recipients", "subject", "content"],
    },
  },
  {
    name: "create_communication",
    description: "Log email communication history linked to a document.",
    inputSchema: {
      type: "object",
      properties: {
        recipients: { type: "array", items: { type: "string" } },
        subject: { type: "string" },
        content: { type: "string" },
        doctype: { type: "string" },
        name: { type: "string" },
      },
      required: ["recipients", "subject", "content", "doctype", "name"],
    },
  },
  {
    name: "get_email_queue",
    description: "Check the status of enqueued emails.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "get_print_settings",
    description: "Retrieve Frappe system print settings.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "bulk_edit",
    description: "Update multiple records of a DocType at once.",
    inputSchema: {
      type: "object",
      properties: {
        doctype: { type: "string", description: "Target DocType" },
        names: { type: "array", items: { type: "string" }, description: "List of document IDs/names" },
        values: { type: "object", description: "Key-value pair changes to apply" },
      },
      required: ["doctype", "names", "values"],
    },
  },
];

export async function handleToolCall(name: string, args: any) {
  switch (name) {
    // ==========================================
    // PHASE 1: CORE DOCUMENT TOOLS
    // ==========================================
    case "create_document":
      return docTools.createDocument(args);
    case "get_document":
      return docTools.getDocument(args);
    case "update_document":
      return docTools.updateDocument(args);
    case "delete_document":
      return docTools.deleteDocument(args);
    case "list_documents":
      return docTools.listDocuments(args);
    case "get_document_count":
      return docTools.getDocumentCount(args);
    case "get_field_value":
      return docTools.getFieldValue(args);
    case "set_field_value":
      return docTools.setFieldValue(args);
    case "rename_document":
      return docTools.renameDocument(args);
    case "get_single_value":
      return docTools.getSingleValue(args);
    case "submit_document":
      return docTools.submitDocument(args);
    case "cancel_document":
      return docTools.cancelDocument(args);

    // ==========================================
    // PHASE 2: GENERIC METHOD CALLER & WRAPPERS
    // ==========================================
    case "call_method":
      return methodTools.callMethod(args);
    case "search_link":
      return methodTools.searchLink(args);
    case "get_list_view":
      return methodTools.getListView(args);
    case "get_form_meta":
      return methodTools.getFormMeta(args);
    case "validate_document":
      return methodTools.validateDocument(args);
    case "get_dashboard_data":
      return methodTools.getDashboardData(args);

    // ==========================================
    // PHASE 3: FILE MANAGEMENT
    // ==========================================
    case "upload_file":
      return fileTools.uploadFile(args);
    case "list_attachments":
      return fileTools.listAttachments(args);
    case "download_file":
      return fileTools.downloadFile(args);
    case "delete_file":
      return fileTools.deleteFile(args);
    case "attach_file_to_document":
      return fileTools.attachFileToDocument(args);

    // ==========================================
    // PHASE 4: AUTHENTICATION & USER MANAGEMENT
    // ==========================================
    case "login_user":
      return authTools.loginUser(args);
    case "logout_user":
      return authTools.logoutUser();
    case "get_current_user":
      return authTools.getCurrentUser();
    case "reset_password":
      return authTools.resetPassword(args);
    case "get_user_info":
      return authTools.getUserInfo(args);
    case "get_user_permissions":
      return authTools.getUserPermissions(args);
    case "switch_user":
      return authTools.switchUser(args);

    // ==========================================
    // PHASE 5: WORKFLOW ENGINE
    // ==========================================
    case "get_workflow_state":
      return workflowTools.getWorkflowState(args);
    case "get_workflow_actions":
      return workflowTools.getWorkflowActions(args);
    case "workflow_transition":
      return workflowTools.workflowTransition(args);
    case "get_workflow_history":
      return workflowTools.getWorkflowHistory(args);

    // ==========================================
    // PHASE 6: REPORTING & ANALYTICS
    // ==========================================
    case "run_query_report":
      return reportTools.runQueryReport(args);
    case "get_report_columns":
      return reportTools.getReportColumns(args);
    case "export_report":
      return reportTools.exportReport(args);
    case "get_dashboard_chart":
      return reportTools.getDashboardChart(args);
    case "get_number_card":
      return reportTools.getNumberCard(args);

    // ==========================================
    // PHASE 7: BACKGROUND JOBS
    // ==========================================
    case "list_jobs":
      return jobTools.listJobs(args);
    case "get_job_status":
      return jobTools.getJobStatus(args);
    case "enqueue_job":
      return jobTools.enqueueJob(args);

    // ==========================================
    // PHASE 8: ADVANCED FEATURES
    // ==========================================
    case "subscribe_to_events":
      return advancedTools.subscribeToEvents(args);
    case "publish_realtime_event":
      return advancedTools.publishRealtimeEvent(args);
    case "get_notifications":
      return advancedTools.getNotifications(args);
    case "get_print_format":
      return advancedTools.getPrintFormat(args);
    case "generate_pdf":
      return advancedTools.generatePdf(args);
    case "import_data":
      return advancedTools.importData(args);
    case "export_data":
      return advancedTools.exportData(args);
    case "download_template":
      return advancedTools.downloadTemplate(args);
    case "send_email":
      return advancedTools.sendEmail(args);
    case "create_communication":
      return advancedTools.createCommunication(args);
    case "get_email_queue":
      return advancedTools.getEmailQueue(args);
    case "get_print_settings":
      return advancedTools.getPrintSettings();
    case "bulk_edit":
      return advancedTools.bulkEdit(args);

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
}
