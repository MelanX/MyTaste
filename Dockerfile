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

# Set environment variables for React build
ENV REACT_APP_API_URL=/
ENV PORT=5000
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

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
COPY backend/routes/ ./routes/
COPY backend/middleware/ ./middleware/
COPY backend/utils/ ./utils/

# Create data directory with proper permissions
RUN mkdir -p data && chmod 777 data

# Copy the built React app from the previous stage
COPY --from=build /app/build ./public

# Create a temporary file with path import and modify server.js properly
RUN echo 'const path = require("path");' > temp.js && \
    cat server.js >> temp.js && \
    mv temp.js server.js

# Add static file serving to Express
RUN sed -i '/app.use(bodyParser.json());/a app.use(express.static("public"));' server.js

# Add route handler for SPA routing
RUN sed -i '/app.use(".", importRouter)/a app.use("*", (req, res) => { res.sendFile(path.join(__dirname, "public/index.html")); });' server.js

# Environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Expose the port
EXPOSE 5000

# Command to run the server
CMD ["node", "server.js"]
