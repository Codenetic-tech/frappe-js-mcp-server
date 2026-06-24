import { FrappeApp } from "frappe-js-sdk";
import { AsyncLocalStorage } from "async_hooks";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

// ─── Global (stdio / single-user) client ─────────────────────────────────────
let globalApp: FrappeApp | null = null;

/**
 * Per-session FrappeApp storage.
 * In SSE multi-user mode each connection stores its own FrappeApp here.
 * AsyncLocalStorage propagates the value through the entire async call-chain
 * that originates from a single HTTP request, so every tool call made inside
 * that request automatically picks up the correct client — without any changes
 * to the tool implementations themselves.
 */
export const sessionStorage = new AsyncLocalStorage<FrappeApp>();

// ─── Factory helpers ──────────────────────────────────────────────────────────

/**
 * Build a FrappeApp from explicit API key + secret.
 * Used when credentials arrive per-connection (SSE multi-user mode).
 */
export function createFrappeAppFromCredentials(
  apiKey: string,
  apiSecret: string
): FrappeApp {
  logger.info("Creating per-session Frappe client (API key auth)");
  return new FrappeApp(config.FRAPPE_URL, undefined, undefined, {
    Authorization: `token ${apiKey}:${apiSecret}`,
  });
}

/**
 * Build (or return cached) global FrappeApp from environment variables.
 * Used in stdio mode or when the server itself has credentials configured.
 */
function getGlobalFrappeApp(): FrappeApp {
  if (globalApp) return globalApp;

  const headers: Record<string, string> = {};

  if (config.FRAPPE_API_KEY && config.FRAPPE_API_SECRET) {
    logger.info("Initializing global Frappe client (API key auth)");
    headers["Authorization"] = `token ${config.FRAPPE_API_KEY}:${config.FRAPPE_API_SECRET}`;
  } else if (config.FRAPPE_TOKEN) {
    logger.info(`Initializing global Frappe client (Token: ${config.FRAPPE_TOKEN_TYPE})`);
    headers["Authorization"] = `${config.FRAPPE_TOKEN_TYPE} ${config.FRAPPE_TOKEN}`;
  } else if (config.FRAPPE_USERNAME && config.FRAPPE_PASSWORD) {
    logger.warn("Initializing global Frappe client (password auth — cookies not persisted in Node.js)");
  } else {
    logger.warn("Initializing global Frappe client without credentials (public access mode)");
  }

  globalApp = new FrappeApp(config.FRAPPE_URL, undefined, undefined, headers);

  if (config.FRAPPE_USERNAME && config.FRAPPE_PASSWORD) {
    globalApp
      .auth()
      .loginWithUsernamePassword(config.FRAPPE_USERNAME, config.FRAPPE_PASSWORD)
      .then(() => logger.info("Global client: password login succeeded"))
      .catch((err) => logger.error("Global client: password login failed", err));
  }

  return globalApp;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the correct FrappeApp for the current async context:
 *   1. Session-scoped app   → SSE multi-user mode (per-connection credentials)
 *   2. Global app           → stdio mode / server-level credentials
 */
export function getFrappeApp(): FrappeApp {
  return sessionStorage.getStore() ?? getGlobalFrappeApp();
}

export function switchFrappeUser(authConfig: {
  type: "api_key" | "cookie" | "oauth" | "password";
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  token?: string;
  tokenType?: "Bearer" | "token";
}) {
  logger.info(`Switching user session (Auth Type: ${authConfig.type})`);
  const headers: Record<string, string> = {};

  if (authConfig.type === "api_key" && authConfig.apiKey && authConfig.apiSecret) {
    headers["Authorization"] = `token ${authConfig.apiKey}:${authConfig.apiSecret}`;
  } else if (authConfig.type === "oauth" && authConfig.token) {
    const type = authConfig.tokenType || "Bearer";
    headers["Authorization"] = `${type} ${authConfig.token}`;
  }

  // In SSE mode, switching user re-creates the session-scoped app
  const newApp = new FrappeApp(config.FRAPPE_URL, undefined, undefined, headers);

  if (authConfig.type === "password" && authConfig.username && authConfig.password) {
    newApp
      .auth()
      .loginWithUsernamePassword(authConfig.username, authConfig.password)
      .then(() => logger.info("switch_user: password login succeeded"))
      .catch((err) => logger.error("switch_user: password login failed", err));
  }

  // If we're inside a session context, we can't replace the store in-place —
  // the caller must re-run inside a new sessionStorage context.
  // In stdio/global mode, update the global singleton.
  if (!sessionStorage.getStore()) {
    globalApp = newApp;
  }

  return newApp;
}

export function getDB() {
  return getFrappeApp().db();
}

export function getFile() {
  return getFrappeApp().file();
}

export function getAuth() {
  return getFrappeApp().auth();
}
