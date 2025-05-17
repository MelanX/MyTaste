FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
COPY public ./public
COPY src ./src
COPY tsconfig.json ./

RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html

# Copy template + script
COPY ../config.template.json /app/config.template.json
COPY ../entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Override default nginx entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
