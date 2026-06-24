import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";

export function handleFrappeError(error: any): never {
  logger.error("Frappe API error details:", error);

  if (error && typeof error === "object") {
    const response = error.response;
    if (response) {
      const status = response.status;
      const data = response.data;
      const errorMessage =
        data?.exception ||
        data?._server_messages ||
        data?.message ||
        error.message ||
        "Unknown Frappe Error";

      logger.error(`Frappe HTTP Error [${status}]: ${JSON.stringify(errorMessage)}`);

      switch (status) {
        case 401:
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Unauthorized: ${typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)}`
          );
        case 403:
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Forbidden/Permission Denied: ${typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)}`
          );
        case 404:
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Not Found: ${typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)}`
          );
        case 409:
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Conflict (Duplicate/Locked): ${typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)}`
          );
        case 500:
          throw new McpError(
            ErrorCode.InternalError,
            `Frappe Server Error: ${typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)}`
          );
        default:
          throw new McpError(
            ErrorCode.InternalError,
            `HTTP ${status}: ${typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)}`
          );
      }
    }
  }

  // Check if it's already an MCP error
  if (error instanceof McpError) {
    throw error;
  }

  const fallbackMessage = error instanceof Error ? error.message : String(error);
  throw new McpError(
    ErrorCode.InternalError,
    `Error communicating with Frappe: ${fallbackMessage}`
  );
}
