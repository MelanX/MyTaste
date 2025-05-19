FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
COPY public ./public
COPY src ./src
COPY tsconfig.json ./

RUN npm install
RUN npm run build

FROM nginx:stable-alpine
RUN apk add --no-cache gettext
COPY --from=build /app/build /usr/share/nginx/html

# Copy template + script
COPY config.template.json /app/config.template.json
COPY entrypoint.sh        /app/entrypoint.sh
RUN  chmod +x /app/entrypoint.sh

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Override default nginx entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
