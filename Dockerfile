# ──────────────────────────────────────────────────────────────
# Stage 1 — Build du frontend React
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 2 — Image de production (Node + Express)
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Dépendances backend uniquement (sans devDependencies)
COPY backend/package*.json ./
RUN npm install --omit=dev

# Code source backend
COPY backend/ .

# Build React → copié dans backend/public, servi par Express
COPY --from=builder /build/frontend/dist ./public

# Volume persistant pour SQLite (/data/rdv.db)
RUN mkdir -p /data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
