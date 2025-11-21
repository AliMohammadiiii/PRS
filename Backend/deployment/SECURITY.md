# CFOWise Security Checklist

This document provides a security checklist for production deployment of CFOWise.

## Pre-Deployment Security Checklist

### Code Security

- [x] **No hardcoded secrets in code**
  - SECRET_KEY is loaded from environment variables only
  - Production requires SECRET_KEY to be set (no fallback)
  - No API keys or passwords hardcoded in source code

- [x] **Secure error handling**
  - Custom exception handler prevents sensitive data exposure
  - Error messages don't reveal internal system details
  - Database errors are sanitized in responses

- [x] **Input validation**
  - All API endpoints use Django REST Framework serializers
  - User input is validated and sanitized
  - File uploads are restricted and validated

- [x] **Authentication and authorization**
  - JWT authentication implemented
  - All endpoints require authentication by default
  - Admin-only endpoints use IsAdminUser permission
  - Rate limiting on authentication endpoints

### Configuration Security

- [x] **Django settings security**
  - DEBUG=False in production
  - SECURE_SSL_REDIRECT=True in production
  - SESSION_COOKIE_SECURE=True in production
  - CSRF_COOKIE_SECURE=True in production
  - HSTS headers configured
  - Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

- [x] **CORS configuration**
  - CORS_ALLOW_ALL_ORIGINS=False in production
  - CORS_ALLOWED_ORIGINS set from environment variable
  - Only specific production domains allowed

- [x] **Environment variables**
  - All secrets in .env file (not in code)
  - .env file excluded from version control
  - Production .env.example provided without secrets

### Infrastructure Security

- [x] **HTTPS/TLS**
  - SSL/TLS certificate required (Let's Encrypt recommended)
  - HTTP to HTTPS redirect configured
  - HSTS headers enabled

- [x] **Firewall**
  - UFW configured and enabled
  - Only SSH and HTTP/HTTPS ports open
  - Unnecessary ports closed

- [x] **SSH security**
  - SSH key-only authentication recommended
  - Password authentication disabled for SSH
  - fail2ban configured

- [x] **Service isolation**
  - Application runs as dedicated user (cfowise)
  - Systemd service with proper permissions
  - No root privileges for application

- [x] **Database security**
  - PostgreSQL with strong password
  - Database user has minimal required permissions
  - Database backups configured

### Logging and Monitoring

- [x] **Structured logging**
  - All errors logged with context
  - Log rotation configured
  - Sensitive data not logged

- [x] **Error monitoring**
  - Custom exception handler logs all errors
  - Frontend logger service for error tracking
  - Production-ready for integration with Sentry/LogRocket

## Production Deployment Checklist

### Initial Setup

1. [ ] Run `setup-ubuntu.sh` as root
2. [ ] Create `.env` file from `deployment/env.production.example`
3. [ ] Generate secure SECRET_KEY: `openssl rand -base64 32`
4. [ ] Set strong database password
5. [ ] Configure ALLOWED_HOSTS with actual domain names
6. [ ] Set CORS_ALLOWED_ORIGINS with production frontend URLs
7. [ ] Install systemd service: `cfowise-backend.service`
8. [ ] Install Nginx configuration
9. [ ] Update Nginx config with domain name
10. [ ] Obtain SSL certificate: `certbot --nginx -d your-domain.com`
11. [ ] Verify SSL certificate renewal is configured

### Security Verification

1. [ ] Test HTTPS redirect (http:// should redirect to https://)
2. [ ] Verify CORS only allows production origins
3. [ ] Test rate limiting on authentication endpoints
4. [ ] Verify DEBUG=False in production
5. [ ] Check that .env file has correct permissions (600)
6. [ ] Verify database credentials are secure
7. [ ] Test authentication flows work correctly
8. [ ] Verify file uploads are restricted and validated
9. [ ] Check firewall rules are correct
10. [ ] Verify fail2ban is running

### Backup Configuration

1. [ ] Set up automated database backups
2. [ ] Set up media files backup
3. [ ] Test backup restoration process
4. [ ] Verify backup retention policy
5. [ ] Document backup recovery procedure

### Monitoring Setup

1. [ ] Configure log rotation
2. [ ] Set up log monitoring (optional: ELK, Splunk, etc.)
3. [ ] Set up error monitoring (optional: Sentry, LogRocket)
4. [ ] Configure alerting for critical errors
5. [ ] Set up health check monitoring

## Ongoing Security Maintenance

### Regular Tasks

- [ ] Keep system packages updated: `sudo apt update && sudo apt upgrade`
- [ ] Keep Python dependencies updated: `pip list --outdated`
- [ ] Keep Node.js dependencies updated: `npm outdated`
- [ ] Review and rotate SECRET_KEY periodically (if compromised)
- [ ] Review access logs for suspicious activity
- [ ] Review error logs for security issues
- [ ] Test backups regularly
- [ ] Review and update CORS_ALLOWED_ORIGINS when needed
- [ ] Monitor for dependency vulnerabilities
- [ ] Review security advisories for Django, React, and other dependencies

### Security Scanning

Run security scans regularly:

```bash
# Backend security scan
cd Backend
bandit -r . -x migrations

# Dependency security check
safety check

# Frontend dependency audit
cd Frontend
npm audit
```

## Incident Response

### If Security Breach Suspected

1. Immediately change SECRET_KEY
2. Rotate database passwords
3. Review access logs
4. Check for unauthorized access
5. Restore from known good backup if needed
6. Notify affected users
7. Document incident

### Security Contacts

- Document your security contact information
- Have incident response plan ready

## Compliance Notes

- Ensure compliance with relevant data protection regulations (GDPR, etc.)
- Implement proper data retention policies
- Document data processing activities
- Ensure user consent mechanisms where required




