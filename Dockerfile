# Multi-stage build for CMBM Admin Tools

# Stage 1: Base
FROM node:24-alpine AS base

# Security: Upgrade all packages to latest versions
RUN apk --no-cache upgrade

# Accept build arguments for versioning
ARG VERSION=24-alpine
ARG BUILD_DATE
ARG VCS_REF
ARG YEAR

# Metadata
LABEL maintainer="CMBM Team" \
      description="CMBM Administrative CLI Tools" \
      version="${VERSION}" \
      build-date="${BUILD_DATE}" \
      vcs-ref="${VCS_REF}" \
      year="${YEAR}"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy admin scripts
COPY src/ src/
COPY bin/ bin/

# Make scripts executable
RUN chmod +x bin/*.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production \
    MONGO_URI=mongodb://cmbm-mongo:27017/mixerdb

# Health check (verify MongoDB connection)
HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
  CMD node src/mongo-connect-test.js || exit 1

# Default command - keep container running for exec commands
CMD ["tail", "-f", "/dev/null"]
