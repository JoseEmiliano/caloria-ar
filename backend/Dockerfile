# ─── Etapa base ──────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini
COPY package*.json ./

# ─── Etapa desarrollo ─────────────────────────────────────────
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]

# ─── Etapa producción ─────────────────────────────────────────
FROM base AS production
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
