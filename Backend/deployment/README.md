# CFOWise Deployment Guide

This guide covers deploying CFOWise on Ubuntu with systemd services and Nginx reverse proxy using git-based deployment.

## Table of Contents

1. [Initial Server Setup](#initial-server-setup)
2. [Application Setup](#application-setup)
3. [Database Configuration](#database-configuration)
4. [Service Configuration](#service-configuration)
5. [Nginx Configuration](#nginx-configuration)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Deployment Process](#deployment-process)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Initial Server Setup

### Prerequisites

- Ubuntu 20.04 LTS or later
- Root or sudo access
- Domain name pointing to server IP

### Run Initial Setup Script

```bash
# Clone or copy the repository to the server
sudo git clone <repository-url> /opt/cfowise
cd /opt/cfowise

# Make setup script executable
sudo chmod +x deployment/setup-ubuntu.sh

# Run the setup script
sudo ./deployment/setup-ubuntu.sh
```

The setup script will:
- Update system packages
- Install Python 3.11, Node.js, PostgreSQL, Nginx, and other dependencies
- Create application user (`cfowise`)
- Set up Python virtual environment
- Create PostgreSQL database
- Configure firewall (UFW)
- Set up fail2ban
- Create necessary directories

## Application Setup

### 1. Configure Environment Variables

```bash
# Copy production environment template
sudo -u cfowise cp deployment/env.production.example /opt/cfowise/.env

# Edit environment file
sudo -u cfowise nano /opt/cfowise/.env
```

Update the following values:
- `SECRET_KEY`: Generate with `openssl rand -base64 32`
- `ALLOWED_HOSTS`: Your domain names (comma-separated)
- `DATABASE_URL`: PostgreSQL connection string
- `CORS_ALLOWED_ORIGINS`: Frontend URLs (comma-separated)

### 2. Install Backend Dependencies

```bash
sudo -u cfowise /opt/cfowise/venv/bin/pip install -r /opt/cfowise/Backend/requirements.txt
```

### 3. Run Database Migrations

```bash
cd /opt/cfowise/Backend
sudo -u cfowise /opt/cfowise/venv/bin/python manage.py migrate
```

### 4. Create Superuser

```bash
sudo -u cfowise /opt/cfowise/venv/bin/python manage.py createsuperuser
```

### 5. Collect Static Files

```bash
sudo -u cfowise /opt/cfowise/venv/bin/python manage.py collectstatic --noinput
```

## Database Configuration

### PostgreSQL Setup

The setup script creates a PostgreSQL database. To manually configure:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE cfowise;
CREATE USER cfowise WITH PASSWORD 'your-secure-password';
ALTER ROLE cfowise SET client_encoding TO 'utf8';
ALTER ROLE cfowise SET default_transaction_isolation TO 'read committed';
ALTER ROLE cfowise SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE cfowise TO cfowise;
\q
```

Update `DATABASE_URL` in `/opt/cfowise/.env`:
```
DATABASE_URL=postgresql://cfowise:your-secure-password@localhost:5432/cfowise
```

### Database Backups

Set up automated backups:

```bash
sudo crontab -e
```

Add:
```
0 2 * * * sudo -u postgres pg_dump -Fc cfowise > /opt/cfowise/backups/db_$(date +\%Y\%m\%d).dump
```

## Service Configuration

### 1. Install Systemd Service

```bash
sudo cp /opt/cfowise/deployment/cfowise-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cfowise-backend
sudo systemctl start cfowise-backend
```

### 2. Check Service Status

```bash
sudo systemctl status cfowise-backend
sudo journalctl -u cfowise-backend -f
```

### 3. Service Management

```bash
# Start service
sudo systemctl start cfowise-backend

# Stop service
sudo systemctl stop cfowise-backend

# Restart service
sudo systemctl restart cfowise-backend

# Reload service (after config changes)
sudo systemctl reload cfowise-backend
```

## Nginx Configuration

### 1. Install Nginx Configuration

```bash
sudo cp /opt/cfowise/deployment/nginx-cfowise.conf /etc/nginx/sites-available/cfowise
sudo ln -s /etc/nginx/sites-available/cfowise /etc/nginx/sites-enabled/
```

### 2. Update Configuration

Edit `/etc/nginx/sites-available/cfowise` and replace `your-domain.com` with your actual domain name.

### 3. Test and Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## SSL/TLS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install certbot if not already installed
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is set up automatically
sudo certbot renew --dry-run
```

## Deployment Process

### Backend Deployment

```bash
# Run as cfowise user
sudo -u cfowise /opt/cfowise/deployment/deploy-backend.sh [branch-name]
```

The deployment script will:
1. Pull latest code from git
2. Activate virtual environment
3. Install/update dependencies
4. Run database migrations
5. Collect static files
6. Restart systemd service
7. Perform health check

### Frontend Deployment

```bash
# Run as cfowise user
sudo -u cfowise /opt/cfowise/deployment/deploy-frontend.sh [branch-name]
```

The deployment script will:
1. Pull latest code from git
2. Install dependencies
3. Build production frontend
4. Deploy to web server directory
5. Verify build success

## Monitoring and Maintenance

### Log Files

- Backend logs: `/var/log/cfowise/django.log`
- Gunicorn access logs: `/var/log/cfowise/gunicorn-access.log`
- Gunicorn error logs: `/var/log/cfowise/gunicorn-error.log`
- Nginx access logs: `/var/log/nginx/cfowise-access.log`
- Nginx error logs: `/var/log/nginx/cfowise-error.log`
- Systemd journal: `journalctl -u cfowise-backend`

### Log Rotation

Log rotation is configured automatically. To manually rotate:

```bash
sudo logrotate -f /etc/logrotate.d/cfowise
```

### Health Checks

Monitor application health:

```bash
# Check service status
sudo systemctl status cfowise-backend

# Check health endpoint
curl http://localhost:8000/health

# Check API endpoint
curl https://your-domain.com/api/me/ -H "Authorization: Bearer <token>"
```

## Backup and Recovery

### Database Backups

```bash
# Manual backup
sudo -u postgres pg_dump -Fc cfowise > /opt/cfowise/backups/db_$(date +%Y%m%d_%H%M%S).dump

# Restore backup
sudo -u postgres pg_restore -d cfowise /opt/cfowise/backups/db_YYYYMMDD_HHMMSS.dump
```

### Media Files Backup

```bash
# Backup media files
sudo tar -czf /opt/cfowise/backups/media_$(date +%Y%m%d).tar.gz /opt/cfowise/media

# Restore media files
sudo tar -xzf /opt/cfowise/backups/media_YYYYMMDD.tar.gz -C /
```

### Automated Backups

Create `/etc/cron.daily/cfowise-backup`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/cfowise/backups"
DATE=$(date +%Y%m%d)

# Database backup
sudo -u postgres pg_dump -Fc cfowise > "$BACKUP_DIR/db_$DATE.dump"

# Media backup
sudo tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" /opt/cfowise/media

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
```

Make executable:
```bash
sudo chmod +x /etc/cron.daily/cfowise-backup
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u cfowise-backend -n 50

# Check permissions
ls -la /opt/cfowise
ls -la /var/log/cfowise
ls -la /var/run/cfowise

# Test configuration
sudo -u cfowise /opt/cfowise/venv/bin/python /opt/cfowise/Backend/manage.py check --deploy
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
sudo -u cfowise psql -h localhost -U cfowise -d cfowise

# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection string in .env
sudo -u cfowise cat /opt/cfowise/.env | grep DATABASE_URL
```

### Static Files Not Serving

```bash
# Recollect static files
sudo -u cfowise /opt/cfowise/venv/bin/python /opt/cfowise/Backend/manage.py collectstatic --noinput --clear

# Check permissions
ls -la /opt/cfowise/Backend/staticfiles
sudo chown -R cfowise:www-data /opt/cfowise/Backend/staticfiles
```

### Nginx Errors

```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/cfowise-error.log

# Test Gunicorn socket
ls -la /var/run/cfowise/gunicorn.sock
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R cfowise:cfowise /opt/cfowise
sudo chown -R cfowise:www-data /opt/cfowise/Backend/staticfiles
sudo chown -R cfowise:www-data /opt/cfowise/media

# Fix permissions
sudo chmod -R 755 /opt/cfowise
sudo chmod -R 775 /opt/cfowise/media
```

## Security Checklist

- [ ] SECRET_KEY is set and unique
- [ ] DEBUG=False in production
- [ ] ALLOWED_HOSTS configured correctly
- [ ] CORS_ALLOWED_ORIGINS set to production domains only
- [ ] Database credentials are secure
- [ ] SSL/TLS certificate installed and valid
- [ ] Firewall (UFW) configured
- [ ] fail2ban enabled
- [ ] SSH key-only access (no password)
- [ ] Regular security updates enabled
- [ ] Backups configured and tested
- [ ] Log files properly rotated
- [ ] Environment variables secured (.env not in git)

## Additional Resources

- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)




