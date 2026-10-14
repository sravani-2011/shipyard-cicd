# ---------- Stage 1: install production dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY app/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# ---------- Stage 2: slim runtime image ----------
FROM node:20-alpine
ARG APP_VERSION=dev
ARG BUILD_NUMBER=local
ARG GIT_COMMIT=unknown
ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=${APP_VERSION} \
    BUILD_NUMBER=${BUILD_NUMBER} \
    GIT_COMMIT=${GIT_COMMIT}
LABEL org.opencontainers.image.title="shipyard" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}"

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY app/ ./
RUN rm -rf test

# Run as the unprivileged "node" user that ships with the base image
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/healthz || exit 1
CMD ["node", "server.js"]
