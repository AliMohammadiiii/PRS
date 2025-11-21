#!/bin/bash
# CFOWise Backend Deployment Script
# This script pulls the latest code, installs dependencies, runs migrations,
# collects static files, and restarts the service.

set -e  # Exit on any error

# Configuration
APP_DIR="/opt/cfowise"
BACKEND_DIR="${APP_DIR}/Backend"
VENV_DIR="${APP_DIR}/venv"
SERVICE_NAME="cfowise-backend"
GIT_BRANCH="${1:-main}"  # Default to main branch if not specified

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
if [ "$(whoami)" != "cfowise" ]; then
    error "This script must be run as the 'cfowise' user"
    exit 1
fi

# Change to application directory
cd "${APP_DIR}" || {
    error "Failed to change to application directory: ${APP_DIR}"
    exit 1
}

log "Starting backend deployment..."
log "Branch: ${GIT_BRANCH}"

# Backup current deployment
BACKUP_DIR="${APP_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
log "Creating backup at ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}"
if [ -d "${BACKEND_DIR}/staticfiles" ]; then
    cp -r "${BACKEND_DIR}/staticfiles" "${BACKUP_DIR}/" || warning "Failed to backup staticfiles"
fi

# Store current git commit for potential rollback
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "${CURRENT_COMMIT}" > "${BACKUP_DIR}/git_commit.txt"
log "Current commit: ${CURRENT_COMMIT}"

# Pull latest code
log "Pulling latest code from git..."
git fetch origin
git checkout "${GIT_BRANCH}"
git pull origin "${GIT_BRANCH}"

# Activate virtual environment
log "Activating virtual environment..."
source "${VENV_DIR}/bin/activate"

# Install/update dependencies
log "Installing dependencies..."
cd "${BACKEND_DIR}"
pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations
log "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
log "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Check Django configuration
log "Checking Django configuration..."
python manage.py check --deploy || {
    error "Django check failed"
    exit 1
}

# Restart service
log "Restarting ${SERVICE_NAME} service..."
sudo systemctl restart "${SERVICE_NAME}"

# Wait for service to start
sleep 3

# Check service status
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    log "Service ${SERVICE_NAME} is running"
else
    error "Service ${SERVICE_NAME} failed to start"
    systemctl status "${SERVICE_NAME}"
    exit 1
fi

# Health check
log "Performing health check..."
HEALTH_URL="http://localhost:8001/health"
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_CHECK_PASSED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s "${HEALTH_URL}" > /dev/null 2>&1; then
        HEALTH_CHECK_PASSED=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "Health check attempt ${RETRY_COUNT}/${MAX_RETRIES} failed, retrying..."
    sleep 2
done

if [ "$HEALTH_CHECK_PASSED" = true ]; then
    log "Health check passed"
    log "Backend deployment completed successfully!"
else
    error "Health check failed after ${MAX_RETRIES} attempts"
    error "Service may not be running correctly. Check logs: sudo journalctl -u ${SERVICE_NAME} -n 50"
    exit 1
fi

