#!/bin/bash
# PRS Frontend Deployment Script
# This script pulls the latest code, installs dependencies, builds the frontend,
# and deploys it to the web server directory.

set -e  # Exit on any error

# Configuration
APP_DIR="/opt/prs"
FRONTEND_DIR="${APP_DIR}/Frontend"
DEPLOY_DIR="/opt/prs/Frontend/dist/spa"
BACKUP_DIR="${APP_DIR}/backups/frontend_$(date +%Y%m%d_%H%M%S)"
GIT_BRANCH="${1:-main}"  # Default to main branch if not specified
NODE_VERSION="20"  # Adjust based on your Node.js version

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as correct user
if [ "$(whoami)" != "prs" ]; then
    error "This script must be run as the 'prs' user"
    exit 1
fi

# Change to application directory
cd "${APP_DIR}" || {
    error "Failed to change to application directory: ${APP_DIR}"
    exit 1
}

log "Starting PRS frontend deployment..."
log "Branch: ${GIT_BRANCH}"

# Pull latest code
log "Pulling latest code from git..."
git fetch origin
git checkout "${GIT_BRANCH}"
git pull origin "${GIT_BRANCH}"

# Check Node.js version
if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
    exit 1
fi

NODE_CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "${NODE_CURRENT}" -lt "${NODE_VERSION}" ]; then
    warning "Node.js version ${NODE_CURRENT} is less than recommended ${NODE_VERSION}"
fi

# Change to frontend directory
cd "${FRONTEND_DIR}" || {
    error "Failed to change to frontend directory: ${FRONTEND_DIR}"
    exit 1
}

# Install dependencies
log "Installing dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --production=false
elif [ -f "pnpm-lock.yaml" ]; then
    pnpm install
else
    npm install
fi

# Build frontend
log "Building frontend for production..."
npm run build || {
    error "Frontend build failed"
    exit 1
}

# Verify build output
if [ ! -d "dist/spa" ]; then
    error "Build output directory 'dist/spa' not found"
    exit 1
fi

# Backup current deployment
log "Creating backup of current deployment..."
mkdir -p "$(dirname "${BACKUP_DIR}")"
if [ -d "${DEPLOY_DIR}" ]; then
    cp -r "${DEPLOY_DIR}" "${BACKUP_DIR}" || warning "Failed to backup current deployment"
fi

# Deploy new build
log "Deploying new build..."
mkdir -p "$(dirname "${DEPLOY_DIR}")"
rm -rf "${DEPLOY_DIR}"
cp -r "dist/spa" "${DEPLOY_DIR}"

# Set proper permissions
log "Setting permissions..."
chown -R prs:www-data "${DEPLOY_DIR}"
chmod -R 755 "${DEPLOY_DIR}"

# Test Nginx configuration
log "Testing Nginx configuration..."
if sudo nginx -t; then
    log "Nginx configuration is valid"
    # Reload Nginx if needed (optional)
    # sudo systemctl reload nginx
else
    error "Nginx configuration test failed"
    exit 1
fi

log "PRS frontend deployment completed successfully!"
log "Deployed to: ${DEPLOY_DIR}"

