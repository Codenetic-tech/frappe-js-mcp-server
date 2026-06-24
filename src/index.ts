import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, handleToolCall } from "./tools/index.js";
import { RESOURCE_TEMPLATES, readResource } from "./resources/index.js";
import { PROMPTS, getPrompt } from "./prompts/index.js";
import { logger } from "./utils/logger.js";
import { getFrappeApp, createFrappeAppFromCredentials, sessionStorage } from "./core/frappe-client.js";
import { FrappeApp } from "frappe-js-sdk";
import http from "http";

// ─── MCP Server setup ─────────────────────────────────────────────────────────

const server = new Server(
  { name: "frappe-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug("Listing tools requested");
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Calling tool: ${name}`);
  try {
    return await handleToolCall(name, args);
  } catch (error: any) {
    logger.error(`Error executing tool ${name}`, error);
    return {
      isError: true,
      content: [{ type: "text", text: error.message || "An unexpected error occurred" }],
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logger.debug("Listing resources requested");
  return { resourceTemplates: RESOURCE_TEMPLATES };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  logger.info(`Reading resource: ${uri}`);
  const result = await readResource(uri);
  return result;
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  logger.debug("Listing prompts requested");
  return { prompts: PROMPTS };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Getting prompt: ${name}`);
  return await getPrompt(name, args || {});
});

// ─── Credential extraction helper ────────────────────────────────────────────

/**
 * Extracts Frappe credentials from an incoming HTTP request.
 * Supports two header styles:
 *
 *   Authorization: token API_KEY:API_SECRET      (standard Frappe token format)
 *   X-Frappe-Api-Key + X-Frappe-Api-Secret       (explicit header pair)
 *
 * Returns null if no credentials are found (falls back to global client).
 */
function extractCredentials(req: http.IncomingMessage): { apiKey: string; apiSecret: string } | null {
  // Option 1: Individual headers (recommended — easier to set in mcp-remote)
  const apiKey = req.headers["x-frappe-api-key"] as string | undefined;
  const apiSecret = req.headers["x-frappe-api-secret"] as string | undefined;
  if (apiKey && apiSecret) {
    return { apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };
  }

  // Option 2: Standard Authorization: token KEY:SECRET header
  const auth = req.headers["authorization"] as string | undefined;
  if (auth?.toLowerCase().startsWith("token ")) {
    const tokenPart = auth.slice(6).trim(); // strip "token "
    const colonIdx = tokenPart.indexOf(":");
    if (colonIdx !== -1) {
      return {
        apiKey: tokenPart.slice(0, colonIdx).trim(),
        apiSecret: tokenPart.slice(colonIdx + 1).trim(),
      };
    }
  }

  return null;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function run() {
  logger.info("Initializing Frappe MCP Server...");

  const transportMode = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();
  const port = parseInt(process.env.MCP_PORT ?? "3000", 10);

  if (transportMode === "sse") {
    // ── SSE / HTTP transport ──────────────────────────────────────────────────
    //
    // Multi-user mode: every SSE connection carries its own Frappe credentials.
    // We create a per-session FrappeApp and store it in AsyncLocalStorage so
    // that all tool calls on that connection automatically use the right client.
    //
    // Map: sessionId → { transport, frappeApp }
    const activeSessions = new Map<string, { transport: SSEServerTransport; app: FrappeApp }>();

    const httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

      // ── CORS headers (allows any Claude Desktop / mcp-remote origin) ────────
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, X-Frappe-Api-Key, X-Frappe-Api-Secret, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // ── Health check ─────────────────────────────────────────────────────────
      if (url.pathname === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          server: "frappe-mcp-server",
          activeSessions: activeSessions.size,
        }));
        return;
      }

      // ── Root info ─────────────────────────────────────────────────────────────
      if (url.pathname === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          name: "frappe-mcp-server",
          version: "1.0.0",
          transport: "sse",
          auth: "Pass credentials via headers: 'Authorization: token KEY:SECRET'  OR  'X-Frappe-Api-Key' + 'X-Frappe-Api-Secret'",
          endpoints: { sse: "/sse", messages: "/message", health: "/health" },
        }));
        return;
      }

      // ── SSE endpoint — client connects here ──────────────────────────────────
      if (url.pathname === "/sse" && req.method === "GET") {
        // Extract per-user credentials from the request
        const creds = extractCredentials(req);

        if (!creds) {
          // No credentials provided and no global fallback configured — reject
          const hasGlobalCreds =
            !!process.env.FRAPPE_API_KEY ||
            !!process.env.FRAPPE_TOKEN ||
            !!process.env.FRAPPE_USERNAME;

          if (!hasGlobalCreds) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              error: "Unauthorized",
              message: "Provide credentials via 'Authorization: token KEY:SECRET' header or 'X-Frappe-Api-Key' + 'X-Frappe-Api-Secret' headers.",
            }));
            logger.warn(`Rejected unauthenticated SSE connection from ${req.socket.remoteAddress}`);
            return;
          }
          // Fall through to global client (single-user or admin mode)
        }

        const frappeApp = creds
          ? createFrappeAppFromCredentials(creds.apiKey, creds.apiSecret)
          : getFrappeApp(); // fall back to global if no per-user creds

        const sseTransport = new SSEServerTransport("/message", res);
        const sessionId = sseTransport.sessionId;

        activeSessions.set(sessionId, { transport: sseTransport, app: frappeApp });
        logger.info(`[${sessionId}] SSE session opened from ${req.socket.remoteAddress} (${creds ? "user credentials" : "global credentials"})`);

        req.on("close", () => {
          activeSessions.delete(sessionId);
          logger.info(`[${sessionId}] SSE session closed`);
        });

        // Connect this transport to the MCP server INSIDE the session context.
        // AsyncLocalStorage propagates frappeApp to every tool call on this connection.
        await sessionStorage.run(frappeApp, () => server.connect(sseTransport));
        return;
      }

      // ── Message endpoint — client POSTs tool calls here ──────────────────────
      if (url.pathname === "/message" && req.method === "POST") {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing sessionId query parameter" }));
          return;
        }

        const session = activeSessions.get(sessionId);
        if (!session) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Session not found or expired" }));
          return;
        }

        // Wrap handlePostMessage inside the session's Frappe context so that
        // getFrappeApp() inside any tool call returns this user's client.
        await sessionStorage.run(session.app, () =>
          session.transport.handlePostMessage(req, res)
        );
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    httpServer.listen(port, "0.0.0.0", () => {
      logger.info(`Frappe MCP Server (SSE) listening on http://0.0.0.0:${port}`);
      logger.info(`  → /sse      — connect with your API credentials in headers`);
      logger.info(`  → /message  — POST tool calls here (sessionId required)`);
      logger.info(`  → /health   — health check`);
    });

    process.on("SIGINT", () => httpServer.close(() => process.exit(0)));
    process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
  } else {
    // ── stdio transport (default — local / single-user) ───────────────────────
    // Validate that global credentials are configured
    const hasGlobalCreds =
      !!(process.env.FRAPPE_API_KEY && process.env.FRAPPE_API_SECRET) ||
      !!process.env.FRAPPE_TOKEN ||
      !!(process.env.FRAPPE_USERNAME && process.env.FRAPPE_PASSWORD);

    if (!hasGlobalCreds) {
      logger.warn("No Frappe credentials configured. Set FRAPPE_API_KEY + FRAPPE_API_SECRET in the environment or MCP config.");
    }

    try {
      getFrappeApp(); // eagerly initialize + validate URL
    } catch (err) {
      logger.error("Client initialization error:", err);
      process.exit(1);
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("Frappe MCP Server running on stdio transport");
  }
}

run().catch((error) => {
  logger.error("Fatal error during server startup:", error);
  process.exit(1);
});
