import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getFrappeApp } from "../core/frappe-client.js";
import { handleFrappeError } from "../core/error-handler.js";
import { logger } from "../utils/logger.js";

export async function callMethod(args: {
  method: string;
  params?: Record<string, any>;
  httpMethod?: "GET" | "POST" | "PUT" | "DELETE";
}) {
  try {
    const httpMethod = args.httpMethod || "POST";
    logger.info(`call_method [${httpMethod}] called for method: ${args.method}`);

    const client = getFrappeApp().call();
    let result: any;

    switch (httpMethod.toUpperCase()) {
      case "GET":
        result = await client.get(args.method, args.params);
        break;
      case "POST":
        result = await client.post(args.method, args.params);
        break;
      case "PUT":
        result = await client.put(args.method, args.params);
        break;
      case "DELETE":
        result = await client.delete(args.method, args.params);
        break;
      default:
        throw new McpError(ErrorCode.InvalidParams, `Unsupported HTTP method: ${httpMethod}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function searchLink(args: {
  doctype: string;
  txt?: string;
  filters?: any;
  reference_doctype?: string;
}) {
  try {
    logger.info(`search_link called for doctype: ${args.doctype}`);
    const client = getFrappeApp().call();
    const result = await client.get("frappe.desk.search.search_link", {
      doctype: args.doctype,
      txt: args.txt || "",
      filters: args.filters ? JSON.stringify(args.filters) : undefined,
      reference_doctype: args.reference_doctype,
      ignore_user_permissions: 0,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getListView(args: {
  doctype: string;
  fields?: string[];
  filters?: any;
  order_by?: string;
  start?: number;
  page_length?: number;
}) {
  try {
    logger.info(`get_list_view called for doctype: ${args.doctype}`);
    const client = getFrappeApp().call();
    const result = await client.post("frappe.desk.reportview.get", {
      doctype: args.doctype,
      fields: args.fields,
      filters: args.filters,
      order_by: args.order_by,
      start: args.start || 0,
      page_length: args.page_length || 20,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getFormMeta(args: { doctype: string }) {
  try {
    logger.info(`get_form_meta called for doctype: ${args.doctype}`);
    const client = getFrappeApp().call();
    // frappe.desk.form.load.getdoc gets the document metadata & schema
    // name param is required (can pass same as doctype for Single docs or any valid name)
    const result = await client.get("frappe.desk.form.load.getdoc", {
      doctype: args.doctype,
      name: args.doctype,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function validateDocument(args: { doctype: string; docname: string }) {
  try {
    logger.info(`validate_document called for doctype: ${args.doctype}, docname: ${args.docname}`);
    const client = getFrappeApp().call();
    // Use frappe.client.get to check if document exists (validate_link endpoint removed in v15)
    const result = await client.get("frappe.client.get", {
      doctype: args.doctype,
      name: args.docname,
    });
    const exists = !!(result as any)?.message;
    return {
      content: [{ type: "text", text: JSON.stringify({ valid: exists, doctype: args.doctype, docname: args.docname }, null, 2) }],
    };
  } catch (error) {
    // If 404 — document does not exist
    return {
      content: [{ type: "text", text: JSON.stringify({ valid: false, doctype: args.doctype, docname: args.docname }, null, 2) }],
    };
  }
}

export async function getDashboardData(args: { chart_name: string }) {
  try {
    logger.info(`get_dashboard_data called for chart: ${args.chart_name}`);
    const client = getFrappeApp().call();
    const result = await client.post(
      "frappe.desk.doctype.dashboard_chart.dashboard_chart.get",
      {
        chart_name: args.chart_name,
      }
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

