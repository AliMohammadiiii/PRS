# PRS Production Deployment Guide

This guide provides step-by-step instructions for deploying PRS (Purchase Request System) to an Ubuntu VPS server with PostgreSQL.

## Prerequisites

- Ubuntu 20.04 LTS or later
- Root or sudo access
- Domain name configured (innovation.nntc.io)
- SSH access to the server

## Quick Start

For automated setup, use the setup script:

```bash
sudo bash Backend/deployment/setup-ubuntu-prs.sh
```

Then follow the "Next Steps" output by the script.

## Manual Deployment Steps

### 1. Server Setup

#### Option A: Automated Setup Script

```bash
sudo bash Backend/deployment/setup-ubuntu-prs.sh
```

This script will:
- Install all required system packages
- Create the `prs` user and group
- Set up directory structure at `/opt/prs`
- Create PostgreSQL database and user
- Configure firewall and fail2ban
- Set up Python virtual environment

#### Option B: Manual Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    postgresql \
    postgresql-contrib \
    nginx \
    git \
    curl \
    build-essential \
    libpq-dev \
    nodejs \
    npm \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban

# Create application user
sudo adduser --disabled-password --gecos "" prs
sudo usermod -aG www-data prs

# Create directories
sudo mkdir -p /opt/prs
sudo mkdir -p /var/log/prs
sudo chown -R prs:www-data /opt/prs
sudo chown -R prs:www-data /var/log/prs
```

### 2. PostgreSQL Setup

```bash
sudo -u postgres psql
```

In PostgreSQL prompt:

```sql
CREATE DATABASE prs;
CREATE USER prs WITH PASSWORD 'your-secure-password-here';
ALTER ROLE prs SET client_encoding TO 'utf8';
ALTER ROLE prs SET default_transaction_isolation TO 'read committed';
ALTER ROLE prs SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE prs TO prs;
\q
```

### 3. Application Deployment

#### Clone Repository

```bash
sudo -u prs git clone <repository-url> /opt/prs
# Or copy your code to /opt/prs
```

#### Set Up Python Environment

```bash
sudo -u prs python3.11 -m venv /opt/prs/venv
sudo -u prs /opt/prs/venv/bin/pip install --upgrade pip
sudo -u prs /opt/prs/venv/bin/pip install -r /opt/prs/Backend/requirements.txt
```

#### Configure Environment

```bash
# Copy production environment template
sudo -u prs cp /opt/prs/Backend/deployment/env.production.prs.example /opt/prs/.env

# Edit environment file
sudo -u prs nano /opt/prs/.env
```

Required environment variables:
- `SECRET_KEY` - Generate with: `openssl rand -base64 32`
- `DEBUG=False`
- `ALLOWED_HOSTS=innovation.nntc.io,www.innovation.nntc.io,127.0.0.1,localhost`
- `DATABASE_URL=postgresql://prs:password@localhost:5432/prs`
- `FORCE_SCRIPT_NAME=/PRS`
- `CORS_ALLOWED_ORIGINS=https://innovation.nntc.io,https://www.innovation.nntc.io`
- `STATIC_ROOT=/opt/prs/Backend/staticfiles`
- `MEDIA_ROOT=/opt/prs/media`
- `LOG_FILE=/var/log/prs/django.log`
- `SECURE_SSL_REDIRECT=True`

#### Run Database Migrations

```bash
cd /opt/prs/Backend
sudo -u prs /opt/prs/venv/bin/python manage.py migrate --noinput
```

#### Create Superuser

```bash
sudo -u prs /opt/prs/venv/bin/python manage.py createsuperuser
```

#### Collect Static Files

```bash
sudo -u prs /opt/prs/venv/bin/python manage.py collectstatic --noinput
```

### 4. Systemd Service Configuration

```bash
# Copy service file
sudo cp /opt/prs/Backend/deployment/prs-backend.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable prs-backend
sudo systemctl start prs-backend

# Check status
sudo systemctl status prs-backend
```

### 5. Nginx Configuration

PRS is configured in the shared Nginx configuration file. Ensure `/etc/nginx/sites-available/cfowise` includes the PRS section (lines 172-264).

If not already configured:

```bash
# Copy Nginx config (if not already present)
sudo cp /opt/prs/Backend/deployment/nginx-cfowise.conf /etc/nginx/sites-available/cfowise

# Enable site
sudo ln -s /etc/nginx/sites-available/cfowise /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

The PRS section should include:
- Static files: `/opt/prs/Backend/staticfiles/`
- Media files: `/opt/prs/media/`
- API proxy: `http://prs_backend` (port 9000)
- Frontend SPA: `/opt/prs/Frontend/dist/spa/`

### 6. SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d innovation.nntc.io -d www.innovation.nntc.io

# Test auto-renewal
sudo certbot renew --dry-run
```

### 7. Frontend Deployment

#### Build Frontend

```bash
cd /opt/prs/Frontend
sudo -u prs npm ci
sudo -u prs npm run build
```

The build output should be in `/opt/prs/Frontend/dist/spa/` which is served by Nginx.

#### Automated Frontend Deployment

Use the deployment script:

```bash
sudo -u prs /opt/prs/Backend/deployment/deploy-prs-frontend.sh
```

### 8. Verification

#### Health Check

```bash
curl http://localhost:9000/health
# Should return: {"status":"healthy"}
```

#### Through Nginx

```bash
curl https://innovation.nntc.io/PRS/health
# Should return: {"status":"healthy"}
```

#### Check Services

```bash
sudo systemctl status prs-backend
sudo systemctl status nginx
sudo systemctl status postgresql
```

#### Check Logs

```bash
# Backend logs
sudo journalctl -u prs-backend -f

# Django logs
tail -f /var/log/prs/django.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Deployment Updates

### Backend Updates

Use the automated deployment script:

```bash
sudo -u prs /opt/prs/Backend/deployment/deploy-prs-backend.sh [branch-name]
```

Or manually:

```bash
cd /opt/prs
sudo -u prs git pull
cd Backend
sudo -u prs /opt/prs/venv/bin/pip install -r requirements.txt
sudo -u prs /opt/prs/venv/bin/python manage.py migrate --noinput
sudo -u prs /opt/prs/venv/bin/python manage.py collectstatic --noinput
sudo systemctl restart prs-backend
```

### Frontend Updates

Use the automated deployment script:

```bash
sudo -u prs /opt/prs/Backend/deployment/deploy-prs-frontend.sh [branch-name]
```

Or manually:

```bash
cd /opt/prs/Frontend
sudo -u prs git pull
sudo -u prs npm ci
sudo -u prs npm run build
# Build output is automatically served from /opt/prs/Frontend/dist/spa/
```

## Backup Strategy

### Automated Backups

Set up automated backups using the backup script:

```bash
# Add to crontab (run daily at 2 AM)
sudo crontab -e
```

Add:

```cron
0 2 * * * sudo -u prs /opt/prs/Backend/deployment/backup-prs.sh >> /var/log/prs/backup.log 2>&1
```

### Manual Backup

```bash
sudo -u prs /opt/prs/Backend/deployment/backup-prs.sh
```

Backups are stored in `/opt/prs/backups/` and include:
- Database dump (compressed SQL)
- Media files (tar.gz)
- Static files (tar.gz, optional)

Backups older than 7 days are automatically cleaned up.

### Restore from Backup

```bash
# Restore database
sudo -u postgres pg_restore -d prs /opt/prs/backups/prs_db_YYYYMMDD_HHMMSS.sql.gz

# Restore media files
cd /opt/prs
tar -xzf /opt/prs/backups/prs_media_YYYYMMDD_HHMMSS.tar.gz
```

## Monitoring and Maintenance

### Service Management

```bash
# Start service
sudo systemctl start prs-backend

# Stop service
sudo systemctl stop prs-backend

# Restart service
sudo systemctl restart prs-backend

# View logs
sudo journalctl -u prs-backend -f
```

### Health Monitoring

Monitor the health endpoint:

```bash
# Local check
curl http://localhost:9000/health

# Through Nginx
curl https://innovation.nntc.io/PRS/health
```

### Performance Monitoring

- Monitor Django logs: `/var/log/prs/django.log`
- Monitor Gunicorn logs: `/var/log/prs/gunicorn-access.log` and `/var/log/prs/gunicorn-error.log`
- Monitor Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

## Troubleshooting

### Service Won't Start

1. Check service status:
   ```bash
   sudo systemctl status prs-backend
   ```

2. Check logs:
   ```bash
   sudo journalctl -u prs-backend -n 50
   ```

3. Verify environment variables:
   ```bash
   sudo systemctl show prs-backend | grep Environment
   ```

4. Test Django manually:
   ```bash
   cd /opt/prs/Backend
   source /opt/prs/venv/bin/activate
   export $(cat /opt/prs/.env | xargs)
   python manage.py check --deploy
   ```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Test connection:
   ```bash
   psql -U prs -d prs -h localhost
   ```

3. Check DATABASE_URL in `.env` file

### Static Files Not Loading

1. Verify static files collected:
   ```bash
   ls -la /opt/prs/Backend/staticfiles/
   ```

2. Check Nginx configuration

3. Run collectstatic again:
   ```bash
   sudo -u prs /opt/prs/venv/bin/python /opt/prs/Backend/manage.py collectstatic --noinput
   ```

### 502 Bad Gateway

1. Check if Gunicorn is running:
   ```bash
   sudo systemctl status prs-backend
   ```

2. Verify upstream in Nginx config points to `127.0.0.1:9000`

3. Check Gunicorn logs:
   ```bash
   tail -f /var/log/prs/gunicorn-error.log
   ```

4. Verify port 9000 is accessible:
   ```bash
   curl http://127.0.0.1:9000/health
   ```

## Security Checklist

- [ ] SECRET_KEY is set and secure (generated with `openssl rand -base64 32`)
- [ ] DEBUG=False in production
- [ ] ALLOWED_HOSTS includes only production domains
- [ ] CORS_ALLOWED_ORIGINS is restricted to production domains
- [ ] SSL certificate is installed and auto-renewal is configured
- [ ] Database password is strong
- [ ] Firewall (UFW) is configured and enabled
- [ ] fail2ban is running
- [ ] Regular security updates are applied
- [ ] Backups are automated and tested
- [ ] Logs are monitored for suspicious activity
- [ ] `.env` file has correct permissions (600) and is not in version control

## Additional Resources

- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## PRS-Specific Notes

- PRS runs on port **9000** (CFOWise uses 8001)
- PRS is deployed at `/opt/prs` (CFOWise uses `/opt/cfowise`)
- PRS systemd service is `prs-backend` (CFOWise uses `cfowise-backend`)
- PRS is served at `/PRS/` subpath on `innovation.nntc.io`
- Both PRS and CFOWise share the same Nginx configuration file
- Frontend base path is `/PRS/` for production builds

