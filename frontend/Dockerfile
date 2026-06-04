FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY public ./public
COPY src ./src
COPY index.html ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./
ARG VITE_VERSION
ARG VITE_COMMIT_URL
ENV VITE_VERSION=$VITE_VERSION
ENV VITE_COMMIT_URL=$VITE_COMMIT_URL
RUN npm run build

FROM nginx:stable-alpine
RUN apk add --no-cache tini gettext
COPY --from=build /app/dist /usr/share/nginx/html
COPY config.template.json /app/config.template.json
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1
ENTRYPOINT ["tini", "--", "/app/entrypoint.sh"]
