#!/bin/bash
# PRS Backup Script
# This script creates backups of the PRS database and media files.
# Run this script as the 'prs' user or with appropriate permissions.
# Recommended: Set up as a cron job for automated daily backups.

set -e  # Exit on any error

# Configuration
APP_DIR="/opt/prs"
BACKUP_DIR="${APP_DIR}/backups"
DB_NAME="prs"
DB_USER="prs"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7  # Keep backups for 7 days

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
if [ "$(whoami)" != "prs" ] && [ "$EUID" -ne 0 ]; then
    error "This script must be run as the 'prs' user or as root"
    exit 1
fi

log "Starting PRS backup process..."

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Database backup
log "Backing up database..."
DB_BACKUP_FILE="${BACKUP_DIR}/prs_db_${DATE}.sql"
if sudo -u postgres pg_dump -Fc "${DB_NAME}" > "${DB_BACKUP_FILE}" 2>/dev/null; then
    log "Database backup created: ${DB_BACKUP_FILE}"
    # Compress the backup
    gzip "${DB_BACKUP_FILE}"
    log "Database backup compressed: ${DB_BACKUP_FILE}.gz"
else
    error "Database backup failed"
    exit 1
fi

# Media files backup
log "Backing up media files..."
MEDIA_BACKUP_FILE="${BACKUP_DIR}/prs_media_${DATE}.tar.gz"
if [ -d "${APP_DIR}/media" ] && [ "$(ls -A ${APP_DIR}/media 2>/dev/null)" ]; then
    tar -czf "${MEDIA_BACKUP_FILE}" -C "${APP_DIR}" media/ || {
        error "Media backup failed"
        exit 1
    }
    log "Media backup created: ${MEDIA_BACKUP_FILE}"
else
    warning "Media directory is empty or doesn't exist, skipping media backup"
fi

# Static files backup (optional, usually not needed as they're generated)
log "Backing up static files..."
STATIC_BACKUP_FILE="${BACKUP_DIR}/prs_static_${DATE}.tar.gz"
if [ -d "${APP_DIR}/Backend/staticfiles" ] && [ "$(ls -A ${APP_DIR}/Backend/staticfiles 2>/dev/null)" ]; then
    tar -czf "${STATIC_BACKUP_FILE}" -C "${APP_DIR}/Backend" staticfiles/ || {
        warning "Static files backup failed (non-critical)"
    }
    log "Static files backup created: ${STATIC_BACKUP_FILE}"
else
    warning "Static files directory is empty or doesn't exist, skipping static files backup"
fi

# Clean up old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "prs_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "prs_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
log "Old backups cleaned up"

# Calculate backup sizes
DB_SIZE=$(du -h "${DB_BACKUP_FILE}.gz" 2>/dev/null | cut -f1 || echo "0")
MEDIA_SIZE=$(du -h "${MEDIA_BACKUP_FILE}" 2>/dev/null | cut -f1 || echo "0")
STATIC_SIZE=$(du -h "${STATIC_BACKUP_FILE}" 2>/dev/null | cut -f1 || echo "0")

log "Backup completed successfully!"
log "Database backup: ${DB_BACKUP_FILE}.gz (${DB_SIZE})"
if [ -f "${MEDIA_BACKUP_FILE}" ]; then
    log "Media backup: ${MEDIA_BACKUP_FILE} (${MEDIA_SIZE})"
fi
if [ -f "${STATIC_BACKUP_FILE}" ]; then
    log "Static files backup: ${STATIC_BACKUP_FILE} (${STATIC_SIZE})"
fi

# Optional: List all current backups
log ""
log "Current backups in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"/prs_* 2>/dev/null | tail -10 || log "No backups found"

