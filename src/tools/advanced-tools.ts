import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getDB, getFrappeApp } from "../core/frappe-client.js";
import { handleFrappeError } from "../core/error-handler.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export async function subscribeToEvents(args: { event_name: string; room?: string }) {
  try {
    logger.info(`subscribe_to_events called for: ${args.event_name}`);
    
    if (!socketInstance) {
      logger.info(`Connecting socket client to: ${config.FRAPPE_URL}`);
      socketInstance = io(config.FRAPPE_URL, {
        transports: ["websocket", "polling"],
      });

      socketInstance.on("connect", () => {
        logger.info("Socket.io client connected successfully to Frappe event server");
      });

      socketInstance.on("disconnect", () => {
        logger.info("Socket.io client disconnected");
      });

      socketInstance.on("error", (err) => {
        logger.error("Socket.io error occurred", err);
      });
    }

    if (args.room) {
      // Subscribing to specific room (e.g., DocType/Docname)
      socketInstance.emit("subscribe", args.room);
      logger.info(`Subscribed to Socket.io room: ${args.room}`);
    }

    socketInstance.on(args.event_name, (data: any) => {
      logger.info(`[REALTIME_EVENT] Received event '${args.event_name}':`, data);
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully initialized subscription listener for event '${args.event_name}'${args.room ? ` in room '${args.room}'` : ""}. Incoming realtime payloads will be printed to stderr logs.`,
        },
      ],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function publishRealtimeEvent(args: {
  event: string;
  message: any;
  user?: string;
  doctype?: string;
  docname?: string;
}) {
  try {
    logger.info(`publish_realtime_event called for: ${args.event}`);
    const client = getFrappeApp().call();

    // frappe.publish_realtime is not whitelisted via HTTP.
    // Use frappe.client.set_value as a workaround to record the event,
    // or enqueue via Background Job. Here we use the whitelisted
    // frappe.desk.notifications.get_notification_info as a ping and
    // respond with a descriptive message since realtime is socket-only.
    //
    // For true publish_realtime, the Frappe server must call it server-side.
    // Via HTTP we can call any custom whitelisted method that internally
    // calls frappe.publish_realtime.
    const params: Record<string, any> = {
      event: args.event,
      message: typeof args.message === "string" ? args.message : JSON.stringify(args.message),
    };
    if (args.user) params.user = args.user;
    if (args.doctype) params.doctype = args.doctype;
    if (args.docname) params.docname = args.docname;

    // Try the realtime endpoint (works if frappe allows it)
    try {
      const result = await client.post("frappe.realtime.publish_realtime", params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (_) {
      // Fallback: return informational message (socket-based publish is server-side only)
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "note",
            message: "publish_realtime is a server-side socket operation. To broadcast events, call this from a whitelisted Python method that invokes frappe.publish_realtime() internally.",
            event: args.event,
            payload: args.message,
          }, null, 2),
        }],
      };
    }
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getNotifications(args: { user: string; limit?: number }) {
  try {
    logger.info(`get_notifications called for user: ${args.user}`);
    const db = getDB();
    const result = await db.getDocList("Notification Log", {
      fields: ["name", "subject", "type", "read", "creation", "from_user"],
      filters: [
        ["for_user", "=", args.user],
        ["read", "=", 0],
      ],
      limit: args.limit || 20,
      orderBy: { field: "creation", order: "desc" },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getPrintFormat(args: {
  doctype: string;
  name: string;
  print_format: string;
  no_letterhead?: boolean;
}) {
  try {
    logger.info(`get_print_format called for: ${args.doctype}/${args.name}`);
    const client = getFrappeApp().call();
    // Use GET with query params — frappe.www.print is a web page, not an API method.
    // Use frappe.utils.print instead.
    const response = await (client as any).axios.get("/api/method/frappe.utils.print", {
      params: {
        doctype: args.doctype,
        name: args.name,
        format: args.print_format,
        no_letterhead: args.no_letterhead ? 1 : 0,
        _lang: "en",
      },
    });
    const html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    return {
      content: [{ type: "text", text: html.slice(0, 5000) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function generatePdf(args: {
  doctype: string;
  name: string;
  print_format: string;
  no_letterhead?: boolean;
}) {
  try {
    logger.info(`generate_pdf called for: ${args.doctype}/${args.name}`);
    const client = getFrappeApp().call();
    
    // Call the standard get_pdf endpoint
    const response = await (client as any).axios.get("/api/method/frappe.utils.pdf.download_pdf", {
      params: {
        doctype: args.doctype,
        name: args.name,
        format: args.print_format,
        no_letterhead: args.no_letterhead ? 1 : 0,
      },
      responseType: "arraybuffer",
    });

    const base64 = Buffer.from(response.data).toString("base64");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              doctype: args.doctype,
              name: args.name,
              pdf_base64: base64,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function importData(args: {
  doctype: string;
  file_name: string;
  submit_after_import?: boolean;
}) {
  try {
    logger.info(`import_data called for doctype: ${args.doctype}`);
    const db = getDB();
    
    // Create a Data Import record
    const dataImport = await db.createDoc("Data Import", {
      reference_doctype: args.doctype,
      import_file: args.file_name,
      submit_after_import: args.submit_after_import ? 1 : 0,
    });

    const client = getFrappeApp().call();
    // Run the import
    const result = await client.post("frappe.core.doctype.data_import.data_import.run_import", {
      data_import: dataImport.name,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function exportData(args: {
  doctype: string;
  filters?: any[];
  fields?: string[];
}) {
  try {
    logger.info(`export_data called for: ${args.doctype}`);
    const client = getFrappeApp().call();
    // Use reportview export which is whitelisted in Frappe v15
    const fields = args.fields || ["name"];
    const result = await client.post("frappe.desk.reportview.export_query", {
      doctype: args.doctype,
      filters: JSON.stringify(args.filters || []),
      fields: JSON.stringify(fields),
      file_format_type: "CSV",
      title: args.doctype,
      csv_delimiter: ",",
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function downloadTemplate(args: { doctype: string }) {
  try {
    logger.info(`download_template called for: ${args.doctype}`);
    const client = getFrappeApp().call();
    // Frappe v15 uses GET with query params for template download
    const response = await (client as any).axios.get(
      "/api/method/frappe.core.doctype.data_import.data_import.download_template",
      {
        params: {
          doctype: args.doctype,
          file_type: "CSV",
          template_type: "import",
        },
        responseType: "arraybuffer",
      }
    );
    const base64 = Buffer.from(response.data).toString("base64");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              doctype: args.doctype,
              template_base64: base64,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function sendEmail(args: {
  recipients: string[];
  subject: string;
  content: string;
  doctype?: string;
  name?: string;
}) {
  try {
    logger.info(`send_email called for: ${args.subject}`);
    const client = getFrappeApp().call();
    const result = await client.post("frappe.core.doctype.communication.email.make", {
      recipients: args.recipients.join(","),
      subject: args.subject,
      content: args.content,
      doctype: args.doctype,
      name: args.name,
      send_email: 1,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function createCommunication(args: {
  recipients: string[];
  subject: string;
  content: string;
  doctype: string;
  name: string;
}) {
  try {
    logger.info(`create_communication called for doc: ${args.doctype}/${args.name}`);
    const db = getDB();
    const result = await db.createDoc("Communication", {
      communication_type: "Communication",
      communication_medium: "Email",
      recipients: args.recipients.join(","),
      subject: args.subject,
      content: args.content,
      reference_doctype: args.doctype,
      reference_name: args.name,
      sent_or_received: "Sent",
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getEmailQueue(args: { limit?: number }) {
  try {
    logger.info("get_email_queue called");
    const db = getDB();
    // Note: 'subject' field is not in the standard Email Queue schema; use safe fields only
    const result = await db.getDocList("Email Queue", {
      fields: ["name", "sender", "recipients", "status", "creation", "modified"],
      limit: args.limit || 20,
      orderBy: { field: "creation", order: "desc" },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getPrintSettings() {
  try {
    logger.info("get_print_settings called");
    const db = getDB();
    const result = await db.getDoc("Print Settings", "Print Settings");
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function bulkEdit(args: {
  doctype: string;
  names: string[];
  values: Record<string, any>;
}) {
  try {
    logger.info(`bulk_edit called for doctype: ${args.doctype}, count: ${args.names.length}`);
    const db = getDB();
    const results = [];
    for (const name of args.names) {
      const res = await db.updateDoc(args.doctype, name, args.values);
      results.push(res);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

