import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getDB, getFrappeApp } from "../core/frappe-client.js";
import { handleFrappeError } from "../core/error-handler.js";
import { logger } from "../utils/logger.js";

export async function getWorkflowState(args: { doctype: string; name: string }) {
  try {
    logger.info(`get_workflow_state called for doctype: ${args.doctype}, name: ${args.name}`);
    const db = getDB();
    const doc = await db.getDoc(args.doctype, args.name);

    const client = getFrappeApp().call();
    let transitions: any = [];
    try {
      // Call standard workflow transitions loader
      transitions = await client.post("frappe.model.workflow.get_transitions", { doc });
    } catch (e) {
      logger.warn("Transitions fetch failed (might not have active workflow):", e);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              document_name: doc.name,
              workflow_state: doc.workflow_state || "No active state / No workflow configured",
              allowed_transitions: transitions,
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

export async function getWorkflowActions(args: { doctype: string; name: string }) {
  try {
    logger.info(`get_workflow_actions called for doctype: ${args.doctype}, name: ${args.name}`);
    const db = getDB();
    const doc = await db.getDoc(args.doctype, args.name);

    const client = getFrappeApp().call();
    const transitions = await client.post("frappe.model.workflow.get_transitions", { doc });
    
    // Extract unique actions
    const actions = Array.isArray(transitions)
      ? transitions.map((t: any) => t.action)
      : [];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ actions }, null, 2),
        },
      ],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function workflowTransition(args: {
  doctype: string;
  name: string;
  action: string;
}) {
  try {
    logger.info(`workflow_transition called for doctype: ${args.doctype}, name: ${args.name}, action: ${args.action}`);
    const db = getDB();
    const doc = await db.getDoc(args.doctype, args.name);

    const client = getFrappeApp().call();
    // apply_workflow_transition expects doc and action
    const result = await client.post("frappe.model.workflow.apply_workflow_transition", {
      doc,
      action: args.action,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getWorkflowHistory(args: { doctype: string; name: string }) {
  try {
    logger.info(`get_workflow_history called for: ${args.doctype}, name: ${args.name}`);
    const db = getDB();
    const result = await db.getDocList("Workflow Action", {
      fields: ["name", "status", "workflow_state", "creation", "owner", "user"],
      filters: [
        ["reference_doctype", "=", args.doctype],
        ["reference_name", "=", args.name],
      ],
      orderBy: { field: "creation", order: "desc" },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}
