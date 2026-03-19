FROM node:24-alpine AS base
RUN apk add --no-cache tini \
    && addgroup -S appgroup && adduser -S appuser -G appgroup

FROM base
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && mkdir -p data uploads
COPY server.js ./
COPY routes/ ./routes/
COPY middleware/ ./middleware/
COPY utils/ ./utils/
RUN chown -R appuser:appgroup /app
VOLUME ["/app/data", "/app/uploads"]
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/health || exit 1
USER appuser
ENTRYPOINT ["tini", "--"]
CMD ["node", "server.js"]
