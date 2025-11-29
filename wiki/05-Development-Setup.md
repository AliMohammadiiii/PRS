# Development Setup

This guide will help you set up a local development environment for the Purchase Request System.

## Prerequisites

### Required Software

- **Python 3.11+**: [Download Python](https://www.python.org/downloads/)
- **Node.js 20+**: [Download Node.js](https://nodejs.org/)
- **PostgreSQL 12+** (optional for development, SQLite can be used)
- **Git**: [Download Git](https://git-scm.com/downloads)

### Recommended Tools

- **VS Code**: Code editor with extensions
- **Postman/Insomnia**: API testing
- **pgAdmin/DBeaver**: Database management (if using PostgreSQL)

## Backend Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd PRS
```

### 2. Navigate to Backend Directory

```bash
cd Backend
```

### 3. Create Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 4. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Set Up Environment Variables

```bash
# Copy example environment file
cp env.example .env

# Edit .env with your configuration
# For development, you can use SQLite (default)
# For PostgreSQL, set DATABASE_URL:
# DATABASE_URL=postgresql://user:password@localhost:5432/prs_dev
```

**Minimum `.env` configuration for development:**

```env
DEBUG=True
SECRET_KEY=change-me-in-development
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///Backend/Backend/db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 6. Set Up Database

#### Option A: SQLite (Default, Easiest)

No additional setup needed. SQLite database will be created automatically.

#### Option B: PostgreSQL

```bash
# Create PostgreSQL database
createdb prs_dev

# Or using psql:
psql -U postgres
CREATE DATABASE prs_dev;
\q

# Update .env:
DATABASE_URL=postgresql://user:password@localhost:5432/prs_dev
```

### 7. Run Migrations

```bash
python manage.py migrate
```

### 8. Create Superuser

```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin user.

### 9. Load Initial Data (Optional)

```bash
# Load lookup types and initial classifications
python manage.py seed_lookup_types

# Or use Django admin to create initial data
```

### 10. Run Development Server

```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### 11. Access Django Admin

Navigate to `http://localhost:8000/admin/` and login with your superuser credentials.

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd Frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables (Optional)

Create `.env` file if needed:

```env
PUBLIC_API_BASE_URL=http://localhost:8000
PUBLIC_ENVIRONMENT=LOCAL
PUBLIC_DEV_API_URL=http://localhost:8000
```

### 4. Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port shown in terminal).

## Verify Installation

### Backend Verification

1. **Health Check**: Visit `http://localhost:8000/health`
   - Should return: `{"status": "healthy"}`

2. **API Docs**: Visit `http://localhost:8000/api/docs/`
   - Should show Swagger UI

3. **Admin Panel**: Visit `http://localhost:8000/admin/`
   - Should show Django admin login

### Frontend Verification

1. **Home Page**: Visit `http://localhost:5173`
   - Should load the application

2. **Login**: Try logging in with your superuser credentials
   - Should authenticate successfully

## Common Development Tasks

### Backend Tasks

#### Run Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest Backend/purchase_requests/tests/test_models.py

# Run with coverage
pytest --cov=purchase_requests
```

#### Create Migrations

```bash
# After model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

#### Create Management Command

```bash
# Create command in an app
python manage.py startapp myapp
# Then create management/commands/mycommand.py
```

#### Access Django Shell

```bash
python manage.py shell
```

#### Collect Static Files

```bash
python manage.py collectstatic
```

### Frontend Tasks

#### Build for Production

```bash
npm run build
```

#### Type Checking

```bash
npm run typecheck
```

#### Format Code

```bash
npm run format.fix
```

#### Run Tests

```bash
npm test
```

## Development Workflow

### Typical Workflow

1. **Start Backend**:
   ```bash
cd Backend
source venv/bin/activate
python manage.py runserver
```

2. **Start Frontend** (in new terminal):
   ```bash
cd Frontend
npm run dev
```

3. **Make Changes**:
   - Backend: Edit Python files, restart server if needed
   - Frontend: Hot reload should work automatically

4. **Test Changes**:
   - Use browser dev tools
   - Test API endpoints with Postman/Insomnia
   - Run automated tests

### Database Management

#### Reset Database (SQLite)

```bash
# Delete database file
rm Backend/Backend/db.sqlite3

# Recreate
python manage.py migrate
python manage.py createsuperuser
```

#### Reset Database (PostgreSQL)

```bash
# Drop and recreate
dropdb prs_dev
createdb prs_dev
python manage.py migrate
python manage.py createsuperuser
```

#### Load Test Data

```bash
# Use Django admin or management commands
python manage.py loaddata fixtures/test_data.json
```

## Troubleshooting

### Backend Issues

#### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

#### Migration Conflicts

```bash
# Reset migrations (careful - only in development!)
# Delete migration files (except __init__.py)
# Then:
python manage.py makemigrations
python manage.py migrate
```

#### Import Errors

```bash
# Ensure virtual environment is activated
which python  # Should show venv path

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Issues

#### Port Already in Use

Vite will automatically use the next available port.

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Type Errors

```bash
# Run type checking
npm run typecheck

# Fix issues or add type assertions
```

### Database Connection Issues

#### PostgreSQL Connection

```bash
# Test connection
psql -U user -d prs_dev

# Check DATABASE_URL in .env
# Format: postgresql://user:password@host:port/database
```

#### SQLite Permissions

```bash
# Ensure write permissions
chmod 666 Backend/Backend/db.sqlite3
```

## IDE Setup

### VS Code Extensions

Recommended extensions:

- **Python**: Python language support
- **Pylance**: Python language server
- **Django**: Django template support
- **ES7+ React/Redux/React-Native snippets**: React snippets
- **Tailwind CSS IntelliSense**: Tailwind autocomplete
- **TypeScript Vue Plugin (Volar)**: TypeScript support

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/Backend/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Next Steps

- [Testing](06-Testing.md) - Learn about testing
- [Backend Overview](07-Backend-Overview.md) - Understand backend structure
- [Frontend Overview](11-Frontend-Overview.md) - Understand frontend structure
- [API Reference](23-API-Reference.md) - API documentation

