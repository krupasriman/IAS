# ==========================================
# Stage 1: Build & Bundle Dependencies
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./

# Clean install all dependencies (including devDependencies for TypeScript & bundling)
RUN npm ci

# Copy application source and configuration files
COPY . .

# Build Vite client assets, Vercel serverless bundle, and standalone server
RUN npm run build

# Remove development dependencies to keep production footprint minimal
RUN npm prune --omit=dev

# ==========================================
# Stage 2: Hardened Production Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create required directories and set ownership to built-in 'node' user (UID 1000)
RUN mkdir -p /app/data && chown -R node:node /app

# Switch to non-root user for principle of least privilege
USER node

# Copy package metadata and production node_modules from builder
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy compiled frontend and standalone backend bundles
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/dist-server ./dist-server

# Expose internal HTTP port
EXPOSE 3001

# Container healthcheck targeting the unauthenticated health status endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the standalone Node.js production server
CMD ["node", "dist-server/index.js"]
