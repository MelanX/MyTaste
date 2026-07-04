FROM node:24-alpine AS base
RUN apk add --no-cache tini \
    && addgroup -S appgroup && adduser -S appuser -G appgroup

# ── Frontend build stage: install deps and build the Vite app ──
FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/public ./public
COPY frontend/src ./src
COPY frontend/index.html ./
COPY frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/tsconfig.worker.json ./
COPY frontend/vite.config.ts ./
ARG VITE_VERSION
ARG VITE_COMMIT_URL
ENV VITE_VERSION=$VITE_VERSION
ENV VITE_COMMIT_URL=$VITE_COMMIT_URL
RUN npm run build

# ── Backend build stage: install deps and compile TypeScript → dist/ ──
FROM base AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src/ ./src/
RUN npm run build

# ── Runtime stage: production deps + compiled backend + built frontend ──
FROM base
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev \
    && mkdir -p data uploads
COPY --from=backend-build /app/backend/dist ./dist
COPY backend/assets ./assets
COPY --from=frontend-build /app/frontend/dist ./public
RUN chown -R appuser:appgroup /app
VOLUME ["/app/data", "/app/uploads"]
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
USER appuser
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
