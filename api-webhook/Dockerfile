# --- ETAPA 1: Builder ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN yarn build

RUN yarn install --production --ignore-scripts --prefer-offline

# --- ETAPA 2: Runner ---
FROM node:22-alpine AS runner

RUN apk add --no-cache tzdata
ENV TZ=America/Santiago NODE_ENV=production HOST=0.0.0.0 PORT=4562

WORKDIR /app

USER node

COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

WORKDIR /app/dist

EXPOSE 4562

CMD ["node", "server.js"]
