import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getDB, getFrappeApp } from "../core/frappe-client.js";
import { handleFrappeError } from "../core/error-handler.js";
import { logger } from "../utils/logger.js";

export async function listJobs(args: { limit?: number; filters?: any[] }) {
  try {
    logger.info("list_jobs called");
    const db = getDB();
    
    // Query Scheduled Job Log
    const logs = await db.getDocList("Scheduled Job Log", {
      fields: ["name", "scheduled_job_type", "status", "creation"],
      limit: args.limit || 20,
      filters: args.filters,
      orderBy: { field: "creation", order: "desc" },
    });

    return {
      content: [{ type: "text", text: JSON.stringify(logs, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getJobStatus(args: { job_id: string }) {
  try {
    logger.info(`get_job_status called for: ${args.job_id}`);
    const db = getDB();
    
    // Fetch log entry
    const log = await db.getDoc("Scheduled Job Log", args.job_id);
    
    return {
      content: [{ type: "text", text: JSON.stringify(log, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function enqueueJob(args: { scheduled_job_type: string }) {
  try {
    logger.info(`enqueue_job called for: ${args.scheduled_job_type}`);
    const client = getFrappeApp().call();
    
    // Call whitelisted endpoint to execute a scheduled job immediately
    const result = await client.post(
      "frappe.core.doctype.scheduled_job_type.scheduled_job_type.execute_scheduled_job",
      {
        scheduled_job_type: args.scheduled_job_type,
      }
    );

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}
