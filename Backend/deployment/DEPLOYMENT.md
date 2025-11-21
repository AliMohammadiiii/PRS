# CFOWise Production Deployment Guide

This guide provides step-by-step instructions for deploying CFOWise to an Ubuntu VPS server with PostgreSQL.

## Prerequisites

- Ubuntu 20.04 LTS or later
- Root or sudo access
- Domain name (optional but recommended)
- SSH access to the server

## Table of Contents

1. [Server Setup](#server-setup)
2. [PostgreSQL Installation and Configuration](#postgresql-installation-and-configuration)
3. [Python Environment Setup](#python-environment-setup)
4. [Application Deployment](#application-deployment)
5. [Nginx Configuration](#nginx-configuration)
6. [Systemd Service Configuration](#systemd-service-configuration)
7. [SSL Certificate Setup](#ssl-certificate-setup)
8. [Frontend Deployment](#frontend-deployment)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Server Setup

### 1. Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Create Application User

```bash
sudo adduser --disabled-password --gecos "" cfowise
sudo usermod -aG sudo cfowise
```

### 3. Install Required System Packages

```bash
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
    python3-certbot-nginx
```

### 4. Install Node.js 20 (if not available)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## PostgreSQL Installation and Configuration

### 1. Start PostgreSQL Service

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User

```bash
sudo -u postgres psql
```

In the PostgreSQL prompt:

```sql
CREATE DATABASE cfowise;
CREATE USER cfowise WITH PASSWORD 'your-secure-password-here';
ALTER ROLE cfowise SET client_encoding TO 'utf8';
ALTER ROLE cfowise SET default_transaction_isolation TO 'read committed';
ALTER ROLE cfowise SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE cfowise TO cfowise;
\q
```

### 3. Configure PostgreSQL for Remote Access (if needed)

Edit `/etc/postgresql/*/main/postgresql.conf`:

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Uncomment and set:
```
listen_addresses = 'localhost'
```

Edit `/etc/postgresql/*/main/pg_hba.conf`:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Add:
```
host    cfowise    cfowise    127.0.0.1/32    md5
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Python Environment Setup

### 1. Switch to Application User

```bash
sudo su - cfowise
```

### 2. Create Application Directory

```bash
mkdir -p /opt/cfowise
cd /opt/cfowise
```

### 3. Clone Repository

```bash
git clone https://github.com/your-org/cfowise.git .
# Or use your repository URL
```

### 4. Create Virtual Environment

```bash
python3.11 -m venv venv
source venv/bin/activate
```

### 5. Install Python Dependencies

```bash
cd Backend
pip install --upgrade pip
pip install -r requirements.txt
```

## Application Deployment

### 1. Create Environment File

```bash
cd /opt/cfowise
cp deployment/env.production.example .env
nano .env
```

Update the following variables:

```bash
SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-base64-32
DEBUG=False
# Include 127.0.0.1 and localhost for internal requests (Gunicorn binds to 127.0.0.1:8001)
# Note: ALLOWED_HOSTS is also set in the systemd service file via DJANGO_ALLOWED_HOSTS
ALLOWED_HOSTS=nntc.io,www.nntc.io,127.0.0.1,localhost
DATABASE_URL=postgresql://cfowise:your-database-password@localhost:5432/cfowise
CORS_ALLOWED_ORIGINS=http://nntc.io,https://nntc.io
FORCE_SCRIPT_NAME=/cfowise
STATIC_ROOT=/opt/cfowise/Backend/staticfiles
MEDIA_ROOT=/opt/cfowise/media
LOG_FILE=/var/log/cfowise/django.log
# Set to False to allow both HTTP and HTTPS, True to force HTTPS redirect
SECURE_SSL_REDIRECT=False
```

Generate a secure SECRET_KEY:

```bash
openssl rand -base64 32
```

### 2. Set Up Log Directory

```bash
sudo mkdir -p /var/log/cfowise
sudo chown cfowise:cfowise /var/log/cfowise
```

### 3. Run Database Migrations

```bash
cd /opt/cfowise/Backend
source ../venv/bin/activate
export $(cat ../.env | xargs)
python manage.py migrate
```

### 4. Create Superuser

```bash
python manage.py createsuperuser
```

### 5. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

### 6. Test Django Configuration

```bash
python manage.py check --deploy
```

## Systemd Service Configuration

### 1. Create Systemd Service File

```bash
sudo nano /etc/systemd/system/cfowise-backend.service
```

Copy the contents from `deployment/cfowise-backend.service` or use:

```ini
[Unit]
Description=CFOWise Backend Gunicorn Service
After=network.target postgresql.service

[Service]
User=cfowise
Group=cfowise
WorkingDirectory=/opt/cfowise/Backend
Environment="PATH=/opt/cfowise/venv/bin"
EnvironmentFile=/opt/cfowise/.env
ExecStart=/opt/cfowise/venv/bin/gunicorn \
    --workers 3 \
    --timeout 120 \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/cfowise/access.log \
    --error-logfile /var/log/cfowise/error.log \
    cfowise.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 2. Start and Enable Service

```bash
sudo systemctl daemon-reload
sudo systemctl start cfowise-backend
sudo systemctl enable cfowise-backend
sudo systemctl status cfowise-backend
```

### 3. Check Logs

```bash
sudo journalctl -u cfowise-backend -f
```

## Nginx Configuration

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/cfowise
```

Use the configuration from `deployment/nginx-cfowise.conf` or:

```nginx
upstream cfowise_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name nntc.io;

    # CFOWise application at /cfowise path
    location /cfowise {
        # Static files
        location /cfowise/static/ {
            alias /opt/cfowise/Backend/staticfiles/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Media files
        location /cfowise/media/ {
            alias /opt/cfowise/media/;
            expires 7d;
            add_header Cache-Control "public";
        }

        # Backend API
        location /cfowise/api/ {
            proxy_pass http://cfowise_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Script-Name /cfowise;
            proxy_redirect off;
        }

        # Django admin
        location /cfowise/admin/ {
            proxy_pass http://cfowise_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Script-Name /cfowise;
            proxy_redirect off;
        }

        # Health check endpoint
        location /cfowise/health {
            proxy_pass http://cfowise_backend;
            proxy_set_header X-Script-Name /cfowise;
            access_log off;
        }

        # Frontend SPA
        location /cfowise {
            root /opt/cfowise/frontend/dist/spa;
            try_files $uri $uri/ /cfowise/index.html;
        }
    }
}
```

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/cfowise /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Certificate Setup (Optional)

The application supports both HTTP and HTTPS. To enable HTTPS:

### 1. Obtain SSL Certificate

```bash
sudo certbot --nginx -d nntc.io
```

### 2. Update Nginx Configuration

After obtaining the certificate, uncomment the SSL configuration lines in `/etc/nginx/sites-available/cfowise`:
- Uncomment `ssl_certificate` and `ssl_certificate_key` lines
- Uncomment SSL protocol and cipher settings

### 3. Optional: Force HTTPS Redirect

If you want to redirect all HTTP traffic to HTTPS, uncomment this line in the HTTP server block:
```nginx
return 301 https://$host$request_uri;
```

And set `SECURE_SSL_REDIRECT=True` in your `.env` file.

### 4. Auto-renewal

Certbot sets up auto-renewal automatically. Test it:

```bash
sudo certbot renew --dry-run
```

## Frontend Deployment

### 1. Install Frontend Dependencies

```bash
cd /opt/cfowise/Frontend
npm ci
```

### 2. Build Frontend

```bash
npm run build
```

### 3. Deploy Build

```bash
sudo mkdir -p /opt/cfowise/frontend
sudo cp -r dist/spa /opt/cfowise/frontend/
sudo chown -R cfowise:www-data /opt/cfowise/frontend
```

### 4. Update API Base URL

Ensure your frontend configuration points to the correct API URL. Update `Frontend/config.ts` or environment variables as needed.

## Monitoring and Maintenance

### 1. View Application Logs

```bash
# Backend logs
sudo journalctl -u cfowise-backend -f

# Django logs
tail -f /var/log/cfowise/django.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Deploy Updates

Use the deployment scripts:

```bash
# Backend
./deployment/deploy-backend.sh

# Frontend
./deployment/deploy-frontend.sh
```

### 3. Database Backups

Set up regular PostgreSQL backups:

```bash
sudo crontab -e
```

Add:

```cron
0 2 * * * sudo -u postgres pg_dump cfowise > /opt/cfowise/backups/db_$(date +\%Y\%m\%d).sql
```

### 4. Health Checks

Monitor the health endpoint:

```bash
curl http://nntc.io/cfowise/health
# or if HTTPS is configured:
# curl https://nntc.io/cfowise/health
```

### 5. Performance Monitoring

Consider setting up:
- Application Performance Monitoring (APM) tools
- Log aggregation (e.g., ELK stack)
- Uptime monitoring

## Troubleshooting

### Service Won't Start

1. Check service status: `sudo systemctl status cfowise-backend`
2. Check logs: `sudo journalctl -u cfowise-backend -n 50`
3. Verify environment variables: `sudo systemctl show cfowise-backend`
4. Test Django: `python manage.py check --deploy`

### Database Connection Issues

1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Test connection: `psql -U cfowise -d cfowise -h localhost`
3. Check DATABASE_URL in .env file
4. Verify pg_hba.conf configuration

### Static Files Not Loading

1. Verify static files collected: `ls -la /opt/cfowise/Backend/staticfiles/`
2. Check Nginx configuration
3. Verify file permissions
4. Run collectstatic again: `python manage.py collectstatic --noinput`

### 502 Bad Gateway

1. Check if Gunicorn is running: `sudo systemctl status cfowise-backend`
2. Verify upstream in Nginx config
3. Check Gunicorn logs
4. Verify port 8000 is accessible: `curl http://127.0.0.1:8000/health`

## Security Checklist

- [ ] SECRET_KEY is set and secure
- [ ] DEBUG=False in production
- [ ] ALLOWED_HOSTS includes only nntc.io
- [ ] CORS_ALLOWED_ORIGINS is restricted
- [ ] SSL certificate is installed and auto-renewal is configured (if using HTTPS)
- [ ] Database password is strong
- [ ] Firewall is configured (UFW recommended)
- [ ] Regular security updates are applied
- [ ] Backups are automated and tested
- [ ] Logs are monitored for suspicious activity

## Additional Resources

- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

