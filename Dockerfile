# ============================================================================
#  Sistema Electrico Futuro v2 - Dockerfile para NaN.builders
# ============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copiar codigo fuente
COPY . .

# Build
RUN npm run build
RUN npm run typecheck

# Runtime - solo archivos estaticos
FROM node:22-alpine AS runtime

RUN npm install -g serve@14

WORKDIR /app

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3030

EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3030/ || exit 1

CMD ["serve", "-s", "dist", "-l", "3030"]
