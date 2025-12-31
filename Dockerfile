# ==============================================================================
# CorePTO Multi-Stage Dockerfile
# Builds both frontend (Vite/React) and backend (Express/Node.js)
# ==============================================================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy frontend source files
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./

# Build frontend for production
RUN npm run build

# Stage 2: Production Image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy server code
COPY server ./server

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./dist

# Copy necessary configuration files
COPY .env.example ./.env.example

# Create data directories
RUN mkdir -p /app/server/cache && \
    mkdir -p /app/server/uploads && \
    mkdir -p /app/data

# Set proper permissions
RUN chown -R node:node /app

# Use non-root user
USER node

# Environment variables
ENV NODE_ENV=production \
    PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose port
EXPOSE 8000

# Start the server
CMD ["node", "server/index.js"]
