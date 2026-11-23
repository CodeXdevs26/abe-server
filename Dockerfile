# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ---------- deps (all deps, incl. dev) ----------
FROM base AS deps
RUN npm ci --no-audit --no-fund

# ---------- dev (hot reload, used by docker-compose.yml) ----------
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "dev"]

# ---------- build ----------
FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- prod (default target) ----------
FROM node:24-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
# Email templates are read at runtime from ./src/app/emailTemplates
COPY --from=build --chown=node:node /app/src/app/emailTemplates ./src/app/emailTemplates
USER node
EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-5001}/" >/dev/null || exit 1
CMD ["node", "dist/server.js"]
