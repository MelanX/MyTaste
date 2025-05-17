FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
COPY public ./public
COPY src ./src
COPY tsconfig.json ./

# Must be set for CRA to inject into build
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV GENERATE_SOURCEMAP=false
ENV NODE_ENV=production

RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html

# Default Nginx config replaced by our own if needed
EXPOSE 80
