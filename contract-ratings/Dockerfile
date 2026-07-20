# Self-contained container image for the Contract Ratings app.
# Serves the built SPA and the /api routes from one Node process, backed
# by node:sqlite + local disk, gated by a shared password. No AWS.
#
#   docker build -t contract-ratings:local contract-ratings

# --- Stage 1: build the SPA in local mode (no Cognito) ---
FROM node:22-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_LOCAL_MODE=1
RUN npm run build

# --- Stage 2: runtime ---
FROM node:22-slim
ENV NODE_ENV=production \
    DATA_DIR=/data \
    STATIC_DIR=/app/public \
    PORT=8080

# The server has no npm dependencies (Node built-ins only). It reuses the
# shared route logic from ../api/core.mjs, so keep that relative path.
COPY server/ /app/server/
COPY api/core.mjs /app/api/core.mjs
COPY --from=frontend /build/dist /app/public

# Data (sqlite db + PWS files) lives on a mounted volume in k8s.
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 8080
WORKDIR /app/server
CMD ["node", "server.mjs"]
