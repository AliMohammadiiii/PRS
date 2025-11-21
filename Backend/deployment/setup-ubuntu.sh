#!/bin/bash
# CFOWise Initial Ubuntu Server Setup Script
# This script sets up a fresh Ubuntu server for CFOWise deployment.
# Run this script as root or with sudo.

set -e  # Exit on any error

# Configuration
APP_USER="cfowise"
APP_DIR="/opt/cfowise"
APP_GROUP="www-data"
PYTHON_VERSION="3.11"
NODE_VERSION="20"

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root or with sudo"
    exit 1
fi

log "Starting CFOWise server setup..."

# Update system packages
log "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install system dependencies
log "Installing system dependencies..."
apt-get install -y \
    python${PYTHON_VERSION} \
    python${PYTHON_VERSION}-venv \
    python${PYTHON_VERSION}-dev \
    python3-pip \
    postgresql \
    postgresql-contrib \
    nginx \
    git \
    curl \
    wget \
    build-essential \
    libpq-dev \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    logrotate

# Install Node.js using NodeSource repository
log "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# Create application user
log "Creating application user: ${APP_USER}..."
if ! id "${APP_USER}" &>/dev/null; then
    useradd -r -s /bin/bash -d "${APP_DIR}" -m "${APP_USER}"
    usermod -aG "${APP_GROUP}" "${APP_USER}"
    log "User ${APP_USER} created"
else
    warning "User ${APP_USER} already exists"
fi

# Create application directories
log "Creating application directories..."
mkdir -p "${APP_DIR}"
mkdir -p "${APP_DIR}/logs"
mkdir -p "${APP_DIR}/backups"
mkdir -p "${APP_DIR}/media"
mkdir -p "${APP_DIR}/staticfiles"
mkdir -p /var/log/cfowise
mkdir -p /var/run/cfowise

# Set directory permissions
chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}"
chown -R "${APP_USER}:${APP_GROUP}" /var/log/cfowise
chown -R "${APP_USER}:${APP_GROUP}" /var/run/cfowise
chmod 755 "${APP_DIR}"
chmod 755 /var/log/cfowise
chmod 755 /var/run/cfowise

# Set up Python virtual environment
log "Setting up Python virtual environment..."
sudo -u "${APP_USER}" python${PYTHON_VERSION} -m venv "${APP_DIR}/venv"
sudo -u "${APP_USER}" "${APP_DIR}/venv/bin/pip" install --upgrade pip

# Set up PostgreSQL database
log "Setting up PostgreSQL database..."
DB_NAME="cfowise"
DB_USER="cfowise"
DB_PASSWORD=$(openssl rand -base64 32)

sudo -u postgres psql <<EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
ALTER ROLE ${DB_USER} SET client_encoding TO 'utf8';
ALTER ROLE ${DB_USER} SET default_transaction_isolation TO 'read committed';
ALTER ROLE ${DB_USER} SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\q
EOF

log "Database created. Password saved to ${APP_DIR}/.db_password"
echo "${DB_PASSWORD}" > "${APP_DIR}/.db_password"
chmod 600 "${APP_DIR}/.db_password"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.db_password"

# Configure firewall
log "Configuring firewall (UFW)..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
log "Firewall configured"

# Configure fail2ban
log "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Clone repository (if not already present)
if [ ! -d "${APP_DIR}/.git" ]; then
    log "Repository not found. Please clone it manually:"
    log "  sudo -u ${APP_USER} git clone <repository-url> ${APP_DIR}"
    log "  Or copy your code to ${APP_DIR}"
else
    log "Repository already exists"
fi

# Create environment file template
log "Creating environment file template..."
cat > "${APP_DIR}/.env.example" <<EOF
# CFOWise Environment Configuration
# Copy this file to .env and update with your values

# Django Settings
SECRET_KEY=change-me-generate-a-secure-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

# Static and Media Files
STATIC_ROOT=${APP_DIR}/Backend/staticfiles
MEDIA_ROOT=${APP_DIR}/media

# CORS
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Logging
LOG_FILE=/var/log/cfowise/django.log
LOG_LEVEL=INFO
EOF

chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env.example"
chmod 600 "${APP_DIR}/.env.example"

log "Setup completed!"
log ""
log "Next steps:"
log "1. Copy ${APP_DIR}/.env.example to ${APP_DIR}/.env and update values"
log "2. Clone or copy your code to ${APP_DIR}"
log "3. Install backend dependencies: sudo -u ${APP_USER} ${APP_DIR}/venv/bin/pip install -r ${APP_DIR}/Backend/requirements.txt"
log "4. Run migrations: sudo -u ${APP_USER} ${APP_DIR}/venv/bin/python ${APP_DIR}/Backend/manage.py migrate"
log "5. Copy systemd service file: sudo cp ${APP_DIR}/deployment/cfowise-backend.service /etc/systemd/system/"
log "6. Copy Nginx config: sudo cp ${APP_DIR}/deployment/nginx-cfowise.conf /etc/nginx/sites-available/cfowise"
log "7. Enable Nginx site: sudo ln -s /etc/nginx/sites-available/cfowise /etc/nginx/sites-enabled/"
log "8. Update Nginx config with your domain name"
log "9. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
log "10. Enable and start services: sudo systemctl enable cfowise-backend && sudo systemctl start cfowise-backend"




