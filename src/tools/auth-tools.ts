import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getAuth, getDB, getFrappeApp, switchFrappeUser } from "../core/frappe-client.js";
import { handleFrappeError } from "../core/error-handler.js";
import { logger } from "../utils/logger.js";

export async function loginUser(args: { usr: string; pwd: string }) {
  try {
    logger.info(`login_user called for user: ${args.usr}`);
    const auth = getAuth();
    const result = await auth.loginWithUsernamePassword(args.usr, args.pwd);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function logoutUser() {
  try {
    logger.info("logout_user called");
    const auth = getAuth();
    const result = await auth.logout();
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getCurrentUser() {
  try {
    logger.info("get_current_user called");
    const auth = getAuth();
    const result = await auth.getLoggedInUser();
    return {
      content: [{ type: "text", text: JSON.stringify({ user: result }, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function resetPassword(args: { username: string }) {
  try {
    logger.info(`reset_password called for: ${args.username}`);
    const auth = getAuth();
    const result = await auth.forgetPassword(args.username);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getUserInfo(args: { email: string }) {
  try {
    logger.info(`get_user_info called for email: ${args.email}`);
    const db = getDB();
    const result = await db.getDoc("User", args.email);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function getUserPermissions(args: { user: string; doctype?: string }) {
  try {
    logger.info(`get_user_permissions called for user: ${args.user}`);
    const db = getDB();
    // Query User Permission doctype (available in all Frappe versions)
    const filters: any[] = [["user", "=", args.user]];
    if (args.doctype) {
      filters.push(["allow", "=", args.doctype]);
    }
    const result = await db.getDocList("User Permission", {
      fields: ["name", "user", "allow", "for_value", "is_default"],
      filters,
      limit: 100,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return handleFrappeError(error);
  }
}

export async function switchUser(args: {
  type: "api_key" | "cookie" | "oauth" | "password";
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  token?: string;
  tokenType?: "Bearer" | "token";
}) {
  try {
    logger.info("switch_user called");
    switchFrappeUser(args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              message: "Successfully switched user session and re-initialized client",
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

