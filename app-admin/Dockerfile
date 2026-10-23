# ============================================
# Dependencias
# ============================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# ============================================
# Builder
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# ============================================
# Producción
# ============================================
FROM node:22-alpine AS production
RUN apk add --no-cache tzdata dumb-init
ENV TZ=America/Santiago NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=4564 HOSTNAME=0.0.0.0
WORKDIR /app

RUN addgroup -S -g 1001 appgroup && adduser -S -u 1001 -G appgroup appuser

COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static

USER appuser
EXPOSE 4564

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:4564/ >/dev/null || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
