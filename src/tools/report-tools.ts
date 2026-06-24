import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getFrappeApp } from "../core/frappe-client.js";
import { handleFrappeError } from "../core/error-handler.js";
import { logger } from "../utils/logger.js";

export async function runQueryReport(args: {
  report_name: string;
  filters?: Record<string, any>;
}) {
  try {
    logger.info(`run_query_report called for: ${args.report_name}`);
    const client = getFrappeApp().call();
    const result = await client.post("frappe.desk.query_report.run", {
      report_name: args.report_name,
      filters: args.filters || {},
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getReportColumns(args: { report_name: string }) {
  try {
    logger.info(`get_report_columns called for: ${args.report_name}`);
    const client = getFrappeApp().call();
    // Run the report with empty filters to extract columns structure
    const result = await client.post("frappe.desk.query_report.run", {
      report_name: args.report_name,
      filters: {},
    });
    const columns = (result as any)?.columns || [];
    return {
      content: [{ type: "text", text: JSON.stringify({ columns }, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function exportReport(args: {
  report_name: string;
  filters?: Record<string, any>;
}) {
  try {
    logger.info(`export_report called for: ${args.report_name}`);
    const client = getFrappeApp().call();
    const result = (await client.post("frappe.desk.query_report.run", {
      report_name: args.report_name,
      filters: args.filters || {},
    })) as any;

    const columns = result?.columns || [];
    const resultData = result?.result || [];

    // Format as simple CSV string
    const headers = columns.map((col: any) => (typeof col === "string" ? col : col.label || col.fieldname)).join(",");
    const rows = resultData.map((row: any) => {
      if (Array.isArray(row)) {
        return row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(",");
      } else if (typeof row === "object" && row !== null) {
        return columns
          .map((col: any) => {
            const key = typeof col === "string" ? col : col.fieldname || col.label;
            return `"${String(row[key] ?? "").replace(/"/g, '""')}"`;
          })
          .join(",");
      }
      return "";
    });

    const csvContent = [headers, ...rows].join("\n");

    return {
      content: [
        {
          type: "text",
          text: csvContent,
        },
      ],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getDashboardChart(args: {
  chart_name: string;
  filters?: Record<string, any>;
}) {
  try {
    logger.info(`get_dashboard_chart called for: ${args.chart_name}`);
    const client = getFrappeApp().call();
    const result = await client.post(
      "frappe.desk.doctype.dashboard_chart.dashboard_chart.get",
      {
        chart_name: args.chart_name,
        filters: args.filters,
      }
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getNumberCard(args: {
  docname: string;
  filters?: Record<string, any>;
}) {
  try {
    logger.info(`get_number_card called for card: ${args.docname}`);
    const client = getFrappeApp().call();
    // The endpoint needs the full doc object, not just the name
    const docResp = await client.get("frappe.client.get", {
      doctype: "Number Card",
      name: args.docname,
    });
    const doc = (docResp as any)?.message;
    if (!doc) throw new Error(`Number Card '${args.docname}' not found`);

    const result = await client.post(
      "frappe.desk.doctype.number_card.number_card.get_result",
      {
        doc: JSON.stringify(doc),
        filters: args.filters ? JSON.stringify(args.filters) : "{}",
      }
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}
