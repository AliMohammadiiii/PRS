# CFOWise Step-by-Step Deployment Guide

Complete deployment guide for CFOWise on Ubuntu VPS with PostgreSQL.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Ubuntu 20.04 LTS or later server
- [ ] Root or sudo access to the server
- [ ] Domain name `nntc.io` pointing to your server IP (application will be at `nntc.io/cfowise`)
- [ ] SSH access to the server
- [ ] Basic knowledge of Linux commands

---

## Step 1: Initial Server Setup

### 1.1 Connect to Your Server

```bash
ssh root@your-server-ip
# or
ssh your-username@your-server-ip
```

### 1.2 Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Install Essential Tools

```bash
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    ufw \
    software-properties-common
```

---

## Step 2: Create Application User

### 2.1 Create User

```bash
sudo adduser --disabled-password --gecos "" cfowise
```

### 2.2 Add to Sudo Group

```bash
sudo usermod -aG sudo cfowise
```

### 2.3 Switch to Application User

```bash
sudo su - cfowise
```

---

## Step 3: Install PostgreSQL

### 3.1 Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

### 3.2 Start PostgreSQL Service

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.3 Create Database and User

```bash
sudo -u postgres psql
```

In the PostgreSQL prompt, run:

```sql
CREATE DATABASE cfowise;
CREATE USER cfowise WITH PASSWORD 'your-secure-password-here';
ALTER ROLE cfowise SET client_encoding TO 'utf8';
ALTER ROLE cfowise SET default_transaction_isolation TO 'read committed';
ALTER ROLE cfowise SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE cfowise TO cfowise;
\q
```

**Important:** Replace `'your-secure-password-here'` with a strong password. Save this password for later use.

### 3.4 Verify Database Connection

```bash
psql -U cfowise -d cfowise -h localhost
```

Enter the password when prompted. If successful, type `\q` to exit.

---

## Step 4: Install Python and Dependencies

### 4.1 Install Python 3.11

```bash
sudo apt install -y python3.11 python3.11-venv python3-pip python3.11-dev
```

### 4.2 Install System Dependencies

```bash
sudo apt install -y \
    build-essential \
    libpq-dev \
    gcc \
    python3-setuptools
```

### 4.3 Verify Python Installation

```bash
python3.11 --version
```

Should output: `Python 3.11.x`

---

## Step 5: Install Node.js

### 5.1 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 5.2 Verify Installation

```bash
node --version
npm --version
```

Should show Node.js v20.x and npm version.

---

## Step 6: Install Nginx

### 6.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 6.2 Start and Enable Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6.3 Verify Nginx is Running

```bash
sudo systemctl status nginx
```

Press `q` to exit.

---

## Step 7: Clone Repository

### 7.1 Create Application Directory

```bash
sudo mkdir -p /opt/cfowise
sudo chown cfowise:cfowise /opt/cfowise
cd /opt/cfowise
```

### 7.2 Clone Repository

```bash
git clone https://github.com/AliMohammadiiii/cfowise.git .
```

**Note:** If the repository is private, you may need to:
- Set up SSH keys, or
- Use a personal access token

---

## Step 8: Set Up Python Virtual Environment

### 8.1 Create Virtual Environment

```bash
cd /opt/cfowise
python3.11 -m venv venv
```

### 8.2 Activate Virtual Environment

```bash
source venv/bin/activate
```

You should see `(venv)` in your prompt.

### 8.3 Upgrade Pip

```bash
pip install --upgrade pip
```

### 8.4 Install Python Dependencies

```bash
cd Backend
pip install -r requirements.txt
```

This may take a few minutes.

---

## Step 9: Configure Environment Variables

### 9.1 Create Environment File

```bash
cd /opt/cfowise
cp deployment/env.production.example .env
```

### 9.2 Edit Environment File

```bash
nano .env
```

### 9.3 Update Required Variables

Update the following values:

```bash
# Generate a secure SECRET_KEY
SECRET_KEY=your-generated-secret-key-here

# Set to False for production
DEBUG=False

# Your domain (application will be at nntc.io/cfowise)
# Include 127.0.0.1 and localhost for internal requests (Gunicorn binds to 127.0.0.1:8001)
# Note: ALLOWED_HOSTS is also set in the systemd service file via DJANGO_ALLOWED_HOSTS
ALLOWED_HOSTS=nntc.io,www.nntc.io,127.0.0.1,localhost

# Database connection (use the password you set in Step 3.3)
DATABASE_URL=postgresql://cfowise:your-database-password@localhost:5432/cfowise

# CORS origins
CORS_ALLOWED_ORIGINS=http://nntc.io,https://nntc.io

# Subpath deployment (required for nntc.io/cfowise)
FORCE_SCRIPT_NAME=/cfowise

# File paths
STATIC_ROOT=/opt/cfowise/Backend/staticfiles
MEDIA_ROOT=/opt/cfowise/media

# Logging
LOG_FILE=/var/log/cfowise/django.log

# Security (False allows both HTTP and HTTPS)
SECURE_SSL_REDIRECT=False
```

### 9.4 Generate SECRET_KEY

In a new terminal or before editing, generate a secure key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

Copy the output and paste it as your `SECRET_KEY` value.

### 9.5 Save and Exit

Press `Ctrl+X`, then `Y`, then `Enter` to save.

---

## Step 10: Set Up Logging Directory

### 10.1 Create Log Directory

```bash
sudo mkdir -p /var/log/cfowise
sudo chown cfowise:cfowise /var/log/cfowise
```

---

## Step 11: Run Database Migrations

### 11.1 Activate Virtual Environment

```bash
cd /opt/cfowise
source venv/bin/activate
```

### 11.2 Load Environment Variables

```bash
cd Backend
export $(cat ../.env | xargs)
```

### 11.3 Run Migrations

```bash
python manage.py migrate
```

You should see output like:
```
Operations to perform:
  Apply all migrations: ...
Running migrations:
  ...
```

### 11.4 Create Superuser

```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin user:
- Username: (enter your username)
- Email: (enter your email, optional)
- Password: (enter a strong password)
- Password (again): (confirm password)

**Save these credentials securely!**

---

## Step 12: Collect Static Files

### 12.1 Collect Static Files

```bash
python manage.py collectstatic --noinput
```

This will create the `staticfiles` directory with all static assets.

---

## Step 13: Test Django Configuration

### 13.1 Run Django Checks

```bash
python manage.py check --deploy
```

This should complete without errors. If there are warnings, review them.

---

## Step 14: Configure Systemd Service

### 14.1 Create Service File

```bash
sudo nano /etc/systemd/system/cfowise-backend.service
```

### 14.2 Add Service Configuration

Copy and paste the following:

```ini
[Unit]
Description=CFOWise Django Backend (Gunicorn)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=notify
User=cfowise
Group=cfowise
WorkingDirectory=/opt/cfowise/Backend
Environment="PATH=/opt/cfowise/venv/bin"
EnvironmentFile=/opt/cfowise/.env
Environment="DJANGO_ALLOWED_HOSTS=nntc.io,www.nntc.io,127.0.0.1,localhost"
ExecStart=/opt/cfowise/venv/bin/gunicorn \
    --workers 3 \
    --timeout 120 \
    --bind 127.0.0.1:8001 \
    --access-logfile /var/log/cfowise/gunicorn-access.log \
    --error-logfile /var/log/cfowise/gunicorn-error.log \
    --log-level info \
    cfowise.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure
RestartSec=10

# Resource limits
MemoryMax=2G
CPUQuota=200%

# Security
NoNewPrivileges=true
ProtectSystem=false
ProtectHome=true
ReadWritePaths=/opt/cfowise /var/log/cfowise /tmp /var/run

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cfowise-backend

[Install]
WantedBy=multi-user.target
```

### 14.3 Save and Exit

Press `Ctrl+X`, then `Y`, then `Enter`.

### 14.4 Reload Systemd

```bash
sudo systemctl daemon-reload
```

### 14.5 Start Service

```bash
sudo systemctl start cfowise-backend
sudo systemctl enable cfowise-backend
```

### 14.6 Check Service Status

```bash
sudo systemctl status cfowise-backend
```

Press `q` to exit. The service should be `active (running)`.

### 14.7 View Logs

```bash
sudo journalctl -u cfowise-backend -f
```

Press `Ctrl+C` to exit. Check for any errors.

---

## Step 15: Configure Nginx

### 15.1 Copy Nginx Configuration

```bash
sudo cp /opt/cfowise/deployment/nginx-cfowise.conf /etc/nginx/sites-available/cfowise
```

### 15.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/cfowise /etc/nginx/sites-enabled/
```

### 15.3 Remove Default Site (Optional)

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 15.4 Test Nginx Configuration

```bash
sudo nginx -t
```

Should output: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### 15.5 Restart Nginx

```bash
sudo systemctl restart nginx
```

### 15.6 Check Nginx Status

```bash
sudo systemctl status nginx
```

---

## Step 16: Build and Deploy Frontend

### 16.1 Navigate to Frontend Directory

```bash
cd /opt/cfowise/Frontend
```

### 16.2 Install Dependencies

```bash
npm ci
```

This may take several minutes.

### 16.3 Build Frontend

```bash
npm run build
```

This will create the `dist/spa` directory.

### 16.4 Create Deployment Directory

```bash
sudo mkdir -p /opt/cfowise/frontend
```

### 16.5 Copy Build Files

```bash
sudo cp -r dist/spa /opt/cfowise/frontend/
sudo chown -R cfowise:www-data /opt/cfowise/frontend
sudo chmod -R 755 /opt/cfowise/frontend
```

---

## Step 17: Configure Firewall

### 17.1 Check Firewall Status

```bash
sudo ufw status
```

### 17.2 Allow SSH (Important!)

```bash
sudo ufw allow ssh
sudo ufw allow 22/tcp
```

### 17.3 Allow HTTP and HTTPS

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 17.4 Enable Firewallه

```bash
sudo ufw enable
```

Type `y` when prompted.

### 17.5 Verify Firewall Rules

```bash
sudo ufw status verbose
```

---

## Step 18: Test the Application

### 18.1 Test Backend Health Endpoint

```bash
curl http://localhost:8000/health
```

Should return a response.

### 18.2 Test via Domain (HTTP)

```bash
curl http://nntc.io/cfowise/health
```

Should return a response.

### 18.3 Test Frontend

Open your browser and navigate to:
```
http://nntc.io/cfowise
```

You should see the CFOWise application.

### 18.4 Test Admin Panel

Navigate to:
```
http://nntc.io/cfowise/admin
```

Log in with the superuser credentials you created in Step 11.4.

---

## Step 19: (Optional) Set Up SSL/HTTPS

### 19.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 19.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d nntc.io
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 19.3 Update Nginx Configuration

If you chose not to redirect, edit the nginx config:

```bash
sudo nano /etc/nginx/sites-available/cfowise
```

Uncomment the SSL certificate lines in the HTTPS server block:
```nginx
ssl_certificate /etc/letsencrypt/live/nntc.io/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/nntc.io/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### 19.4 Test and Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 19.5 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

### 19.6 Test HTTPS

```bash
curl https://nntc.io/cfowise/health
```

---

## Step 20: Set Up Automated Backups

### 20.1 Create Backup Script

```bash
sudo nano /opt/cfowise/backup.sh
```

Add the following:

```bash
#!/bin/bash
BACKUP_DIR="/opt/cfowise/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump cfowise > $BACKUP_DIR/db_$DATE.sql

# Backup media files
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /opt/cfowise/media

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### 20.2 Make Script Executable

```bash
chmod +x /opt/cfowise/backup.sh
```

### 20.3 Set Up Cron Job

```bash
crontab -e
```

Add this line to run daily at 2 AM:

```cron
0 2 * * * /opt/cfowise/backup.sh >> /var/log/cfowise/backup.log 2>&1
```

---

## Step 21: Final Verification

### 21.1 Check All Services

```bash
sudo systemctl status cfowise-backend
sudo systemctl status nginx
sudo systemctl status postgresql
```

All should be `active (running)`.

### 21.2 Check Application Logs

```bash
tail -f /var/log/cfowise/django.log
```

Press `Ctrl+C` to exit.

### 21.3 Test API Endpoints

```bash
# Health check
curl http://nntc.io/cfowise/health

# API endpoint (will require authentication)
curl http://nntc.io/cfowise/api/
```

### 21.4 Verify Frontend

- Open `http://nntc.io/cfowise` in your browser
- Test login functionality
- Navigate through the application
- Check that all pages load correctly

---

## Troubleshooting

### Backend Service Won't Start

1. Check service status:
   ```bash
   sudo systemctl status cfowise-backend
   ```

2. Check logs:
   ```bash
   sudo journalctl -u cfowise-backend -n 50
   ```

3. Verify environment variables:
   ```bash
   sudo systemctl show cfowise-backend | grep Environment
   ```

4. Test Django manually:
   ```bash
   cd /opt/cfowise/Backend
   source ../venv/bin/activate
   export $(cat ../.env | xargs)
   python manage.py check --deploy
   ```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Test connection:
   ```bash
   psql -U cfowise -d cfowise -h localhost
   ```

3. Check DATABASE_URL in `.env` file

4. Verify pg_hba.conf allows local connections:
   ```bash
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   ```
   Should have: `local   all             all                                     peer`

### Nginx 502 Bad Gateway

1. Check if backend is running:
   ```bash
   curl http://127.0.0.1:8000/health
   ```

2. Check Nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. Verify upstream in nginx config points to correct port

### Static Files Not Loading

1. Verify static files collected:
   ```bash
   ls -la /opt/cfowise/Backend/staticfiles/
   ```

2. Check Nginx static file location:
   ```bash
   sudo nginx -T | grep static
   ```

3. Verify file permissions:
   ```bash
   ls -la /opt/cfowise/Backend/staticfiles/ | head
   ```

### Frontend Not Loading

1. Verify build directory exists:
   ```bash
   ls -la /opt/cfowise/frontend/dist/spa/
   ```

2. Check Nginx root directory:
   ```bash
   sudo nginx -T | grep root
   ```

3. Verify file permissions:
   ```bash
   ls -la /opt/cfowise/frontend/
   ```

---

## Maintenance Commands

### Update Application

```bash
cd /opt/cfowise
git pull origin main
source venv/bin/activate
cd Backend
pip install -r requirements.txt
export $(cat ../.env | xargs)
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart cfowise-backend
```

### View Logs

```bash
# Backend logs
sudo journalctl -u cfowise-backend -f

# Django logs
tail -f /var/log/cfowise/django.log

# Nginx access logs
sudo tail -f /var/log/nginx/cfowise-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/cfowise-error.log
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart cfowise-backend

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Security Checklist

- [ ] SECRET_KEY is set and secure
- [ ] DEBUG=False in production
- [ ] ALLOWED_HOSTS includes only nntc.io
- [ ] CORS_ALLOWED_ORIGINS is restricted
- [ ] Database password is strong
- [ ] Firewall (UFW) is configured and enabled
- [ ] Regular security updates are applied
- [ ] Backups are automated and tested
- [ ] Logs are monitored
- [ ] SSL certificate is installed (if using HTTPS)
- [ ] Superuser password is strong
- [ ] SSH key authentication is set up (recommended)

---

## Support and Resources

- **Repository:** https://github.com/AliMohammadiiii/cfowise
- **Django Documentation:** https://docs.djangoproject.com/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/

---

## Quick Reference

### Important Directories
- Application: `/opt/cfowise`
- Backend: `/opt/cfowise/Backend`
- Frontend: `/opt/cfowise/Frontend`
- Static files: `/opt/cfowise/Backend/staticfiles`
- Media files: `/opt/cfowise/media`
- Logs: `/var/log/cfowise`
- Environment: `/opt/cfowise/.env`

### Important Commands
```bash
# Activate virtual environment
source /opt/cfowise/venv/bin/activate

# Restart backend
sudo systemctl restart cfowise-backend

# Check backend status
sudo systemctl status cfowise-backend

# View backend logs
sudo journalctl -u cfowise-backend -f

# Run migrations
cd /opt/cfowise/Backend && source ../venv/bin/activate && export $(cat ../.env | xargs) && python manage.py migrate
```

---

## Quick Update: Deploy Migration Files

If you need to update the server with new migration files (like the accounts app migrations):

```bash
# On your local machine - push the changes
git push origin main

# On the server - pull and apply migrations
cd /opt/cfowise
git pull origin main
cd Backend
source ../venv/bin/activate
export $(cat ../.env | xargs)
python manage.py migrate accounts  # Apply accounts migrations first
python manage.py migrate            # Apply all remaining migrations
```

**Note:** If you encounter the "accounts_user does not exist" error, make sure the migration files are present in `/opt/cfowise/Backend/accounts/migrations/` before running migrations.

---

**Deployment Complete!** 🎉

Your CFOWise application should now be accessible at `http://nntc.io/cfowise`

