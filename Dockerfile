# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsup.config.ts ./
COPY src ./src

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# ── Server-level config (hardcoded by you, the admin) ────────────────────────
# FRAPPE_URL is the only thing hardcoded. No credentials here.
# Every connecting user provides their own API key/secret via request headers.
ENV MCP_TRANSPORT=sse
ENV MCP_PORT=3000
ENV LOG_LEVEL=info
# ENV FRAPPE_URL=https://your-frappe-instance.frappe.cloud   ← set at runtime

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
