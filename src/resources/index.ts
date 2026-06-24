import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getDB, getAuth } from "../core/frappe-client.js";
import { logger } from "../utils/logger.js";

export const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "schema://{doctype}",
    name: "DocType Schema",
    description: "Full metadata schema definition of a Frappe DocType",
    mimeType: "application/json",
  },
  {
    uriTemplate: "schema://{doctype}/fields",
    name: "DocType Fields Schema",
    description: "List of field definitions for a Frappe DocType",
    mimeType: "application/json",
  },
  {
    uriTemplate: "data://{doctype}/{name}",
    name: "Document Data",
    description: "Live data content of a Frappe document instance",
    mimeType: "application/json",
  },
  {
    uriTemplate: "report://{report_name}",
    name: "Report Definition",
    description: "Definition rules and settings of a Frappe report",
    mimeType: "application/json",
  },
  {
    uriTemplate: "workflow://{doctype}",
    name: "Workflow Definition",
    description: "Workflow state transitions configured for a DocType",
    mimeType: "application/json",
  },
  {
    uriTemplate: "user://me",
    name: "Current User Profile",
    description: "The User profile document for the active authenticated session",
    mimeType: "application/json",
  },
];

export async function readResource(uri: string) {
  logger.info(`Reading resource: ${uri}`);

  // schema://{doctype}/fields
  let fieldsMatch = uri.match(/^schema:\/\/([^/]+)\/fields$/);
  if (fieldsMatch) {
    const doctype = decodeURIComponent(fieldsMatch[1]);
    const db = getDB();
    const schema = await db.getDoc("DocType", doctype);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify((schema as any).fields || [], null, 2),
        },
      ],
    };
  }

  // schema://{doctype}
  let match = uri.match(/^schema:\/\/([^/]+)$/);
  if (match) {
    const doctype = decodeURIComponent(match[1]);
    const db = getDB();
    const schema = await db.getDoc("DocType", doctype);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
  }

  // data://{doctype}/{name}
  match = uri.match(/^data:\/\/([^/]+)\/([^/]+)$/);
  if (match) {
    const doctype = decodeURIComponent(match[1]);
    const name = decodeURIComponent(match[2]);
    const db = getDB();
    const doc = await db.getDoc(doctype, name);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(doc, null, 2),
        },
      ],
    };
  }

  // report://{report_name}
  match = uri.match(/^report:\/\/([^/]+)$/);
  if (match) {
    const reportName = decodeURIComponent(match[1]);
    const db = getDB();
    const report = await db.getDoc("Report", reportName);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  }

  // workflow://{doctype}
  match = uri.match(/^workflow:\/\/([^/]+)$/);
  if (match) {
    const doctype = decodeURIComponent(match[1]);
    const db = getDB();
    const workflows = await db.getDocList("Workflow", {
      filters: [["document_type", "=", doctype]],
    });
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(workflows, null, 2),
        },
      ],
    };
  }

  // user://me
  if (uri === "user://me") {
    const auth = getAuth();
    const db = getDB();
    const userEmail = await auth.getLoggedInUser();
    if (!userEmail) {
      throw new McpError(ErrorCode.InvalidRequest, "No user is currently logged in.");
    }
    const userDoc = await db.getDoc("User", userEmail);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(userDoc, null, 2),
        },
      ],
    };
  }

  throw new McpError(ErrorCode.InvalidRequest, `Unknown or unsupported resource URI: ${uri}`);
}
