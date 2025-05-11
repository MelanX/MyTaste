# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies for the frontend
COPY package*.json ./
RUN npm install

# Copy frontend source code
COPY public/ ./public/
COPY src/ ./src/
COPY tsconfig.json ./

ENV REACT_APP_API_URL=/api
ENV PORT=5000
ENV NODE_ENV=production

# Build the React app
RUN npm run build

# Stage 2: Setup the runtime environment
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies for the backend
COPY backend/package*.json ./
RUN npm install --production

# Copy the backend code
COPY backend/server.js ./

# Create data directory
RUN mkdir -p data

# Copy the built React app from the previous stage
COPY --from=build /app/build ./public

# Add static file serving to Express
RUN sed -i '/app.use(bodyParser.json());/a app.use(express.static("public"));' server.js

# Environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Expose the port
EXPOSE 5000

# Command to run the server
CMD ["node", "server.js"]
