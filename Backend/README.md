# CFOWise

CFOWise is a comprehensive financial reporting system built with Django REST Framework backend and React frontend.

## Project Structure

```
CFOWise/
├── Backend/              # Django backend project
│   ├── cfowise/         # Django project package
│   │   ├── settings.py  # Main Django settings
│   │   ├── urls.py      # URL configuration
│   │   └── wsgi.py      # WSGI application
│   ├── manage.py        # Django management script
│   └── requirements.txt # Python dependencies
├── Frontend/            # React frontend
│   ├── client/         # React application code
│   ├── routes/         # TanStack Router routes
│   ├── services/       # API service layer
│   └── package.json    # Node.js dependencies
├── accounts/           # Django app: User management
├── core/               # Django app: Base models
├── classifications/    # Django app: Lookup tables
├── org/                # Django app: Organization structure
├── periods/            # Django app: Financial periods
├── reports/            # Django app: Report definitions
├── submissions/        # Django app: Report submissions
├── audit/              # Django app: Audit trail
└── deployment/         # Deployment configuration and scripts
```

## Technologies

### Backend
- Django 5.0+
- Django REST Framework
- PostgreSQL (production) / SQLite (development)
- JWT Authentication
- Gunicorn (production)

### Frontend
- React 19
- TypeScript
- TanStack Router
- TanStack Query
- Vite
- TailwindCSS
- Radix UI

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL (for production) or SQLite (for development)

### Backend Setup

1. Navigate to Backend directory:
```bash
cd Backend
```

2. Create virtual environment:
```bash
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp ../env.example .env
# Edit .env with your configuration
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Create superuser:
```bash
python manage.py createsuperuser
```

7. Run development server:
```bash
python manage.py runserver
```

### Frontend Setup

1. Navigate to Frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port shown in the terminal).

## Production Deployment

For production deployment on Ubuntu with systemd and Nginx, see [deployment/README.md](deployment/README.md).

Quick deployment steps:

1. Run initial server setup:
```bash
sudo ./deployment/setup-ubuntu.sh
```

2. Configure environment variables:
```bash
sudo -u cfowise cp deployment/env.production.example /opt/cfowise/.env
sudo -u cfowise nano /opt/cfowise/.env
```

3. Deploy backend:
```bash
sudo -u cfowise /opt/cfowise/deployment/deploy-backend.sh
```

4. Deploy frontend:
```bash
sudo -u cfowise /opt/cfowise/deployment/deploy-frontend.sh
```

For detailed deployment instructions, see [deployment/README.md](deployment/README.md).

## Environment Variables

### Backend

See [env.example](env.example) for development and [deployment/env.production.example](deployment/env.production.example) for production.

Required variables:
- `SECRET_KEY`: Django secret key (required in production)
- `DEBUG`: Set to `False` in production
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `DATABASE_URL`: Database connection string
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (production only)

### Frontend

Frontend uses environment variables for API configuration. Check `Frontend/.env.example` if needed.

## Security

See [deployment/SECURITY.md](deployment/SECURITY.md) for the complete security checklist.

Key security features:
- JWT authentication
- Rate limiting on authentication endpoints
- CORS configuration
- Security headers
- Input validation and sanitization
- Secure error handling
- No hardcoded secrets

## Testing

### Backend Tests
```bash
cd Backend
python manage.py test
```

### Frontend Tests
```bash
cd Frontend
npm test
```

## CI/CD

The project includes GitHub Actions CI/CD configuration:
- Code formatting checks (Black)
- Linting (flake8)
- Security scanning (bandit, safety)
- Type checking
- Build verification
- Migration checks

## Documentation

- [Deployment Guide](deployment/README.md)
- [Security Checklist](deployment/SECURITY.md)
- [Data Model Documentation](docs/data-model.md)

## Contributing

1. Follow the code style guidelines
2. Ensure all tests pass
3. Run linting and type checking before committing
4. Update documentation as needed

## License

[Your License Here]




