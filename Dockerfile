# ============================================================================
#  Sistema Eléctrico Futuro v2 — Dockerfile para NaN.builders
# ============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copiar código fuente
COPY . .

# Build
RUN npm run build
RUN npm run typecheck

# Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/healthz || exit 1

CMD ["node", "dist-server/index.js"]
