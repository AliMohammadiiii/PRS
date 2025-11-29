# Project Structure

## Directory Organization

```
PRS/
├── Backend/                    # Django backend application
│   ├── Backend/                # Django project package
│   │   └── cfowise/            # Main Django project settings
│   │       ├── settings.py      # Django configuration
│   │       ├── urls.py         # URL routing
│   │       ├── wsgi.py         # WSGI application
│   │       └── asgi.py         # ASGI application
│   ├── accounts/               # User management app
│   ├── audit/                  # Audit trail app
│   ├── classifications/        # Lookup tables app
│   ├── core/                   # Base models app
│   ├── teams/                  # Team management app
│   ├── workflows/              # Workflow templates app
│   ├── prs_forms/              # Form templates app
│   ├── purchase_requests/      # Core purchase request app
│   ├── attachments/            # File attachments app
│   ├── approvals/               # Approval history app
│   ├── prs_team_config/        # Team configuration app
│   ├── org/                     # Organization structure (legacy)
│   ├── periods/                 # Financial periods (legacy)
│   ├── reports/                 # Report definitions (legacy)
│   ├── submissions/             # Report submissions (legacy)
│   ├── deployment/              # Deployment scripts and configs
│   ├── docs/                    # Backend documentation
│   ├── manage.py                # Django management script
│   ├── requirements.txt         # Python dependencies
│   ├── pytest.ini              # Pytest configuration
│   └── docker-compose.yml       # Docker compose config
│
├── Frontend/                   # React frontend application
│   ├── client/                 # React client components
│   ├── routes/                 # TanStack Router routes
│   ├── services/               # API service layer
│   │   └── api/                # API service modules
│   ├── types/                  # TypeScript type definitions
│   ├── libs/                   # Utility libraries
│   ├── providers/              # React context providers
│   ├── shared/                 # Shared components and utilities
│   ├── theme/                  # Theme configuration
│   ├── server/                 # Server-side rendering
│   ├── public/                 # Static assets
│   ├── assets/                 # Compiled assets
│   ├── package.json            # Node.js dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── vite.config.ts          # Vite configuration
│   └── tailwind.config.ts      # TailwindCSS configuration
│
├── wiki/                       # Documentation (this directory)
├── Manual Test scenarios/      # Manual testing scenarios
├── PRD.md                      # Product Requirements Document
├── MIGRATION_PLAN.md           # Migration planning document
└── PRS_E2E_TEST_SCENARIOS.md  # End-to-end test scenarios
```

## Backend App Organization

### Core Apps

#### `core/`
Base models and utilities used across all apps.

- **models.py**: `BaseModel` with UUID, timestamps, soft deletes
- **views.py**: Base views and utilities

#### `accounts/`
User management and authentication.

- **models.py**: `User` (extends AbstractUser), `AccessScope`
- **views.py**: User management endpoints
- **serializers.py**: User serialization
- **permissions.py**: Permission classes
- **management/commands/**: Custom management commands

#### `teams/`
Team management for PRS.

- **models.py**: `Team` model
- **views.py**: Team CRUD endpoints
- **serializers.py**: Team serialization

#### `classifications/`
Lookup tables for classifications.

- **models.py**: `LookupType`, `Lookup`
- **views.py**: Lookup endpoints
- **serializers.py**: Lookup serialization

### PRS-Specific Apps

#### `workflows/`
Workflow template management.

- **models.py**: 
  - `WorkflowTemplate` (team-agnostic templates)
  - `WorkflowTemplateStep` (sequential steps)
  - `WorkflowTemplateStepApprover` (role-based approvers)
  - Legacy: `Workflow`, `WorkflowStep`, `WorkflowStepApprover`
- **views.py**: Workflow template endpoints
- **serializers.py**: Workflow serialization

#### `prs_forms/`
Form template management.

- **models.py**: 
  - `FormTemplate` (team-agnostic templates with versioning)
  - `FormField` (field definitions)
- **views.py**: Form template endpoints
- **serializers.py**: Form serialization

#### `purchase_requests/`
Core purchase request logic.

- **models.py**: 
  - `PurchaseRequest` (main request model)
  - `RequestFieldValue` (form field values)
- **views.py**: Request CRUD and workflow actions
- **serializers.py**: Request serialization
- **services.py**: Business logic (workflow progression, validation, etc.)
- **tests/**: Test suite

#### `attachments/`
File attachment management.

- **models.py**: 
  - `Attachment` (file attachments)
  - `AttachmentCategory` (team-specific categories)
- **views.py**: Attachment endpoints
- **serializers.py**: Attachment serialization

#### `approvals/`
Approval history tracking.

- **models.py**: `ApprovalHistory` (approval/rejection records)
- **serializers.py**: Approval history serialization

#### `prs_team_config/`
Team-specific configuration.

- **models.py**: `TeamPurchaseConfig` (team + purchase_type → templates mapping)

#### `audit/`
Audit trail system.

- **models.py**: 
  - `AuditEvent` (audit events)
  - `FieldChange` (field-level changes)
- **views.py**: Audit trail endpoints
- **serializers.py**: Audit serialization
- **signals.py**: Automatic audit logging

### Legacy Apps (CFO Wise)

These apps remain for data preservation but are not actively used in PRS:

- `org/`: Organization structure
- `periods/`: Financial periods
- `reports/`: Report definitions
- `submissions/`: Report submissions

## Frontend Structure

### Routes (`Frontend/routes/`)

TanStack Router file-based routing:

```
routes/
├── __root.tsx                  # Root layout
├── index.tsx                   # Home/landing page
├── login.tsx                   # Login page
├── (dashboard)/                # Dashboard route group
│   ├── _dashboardLayout.tsx    # Dashboard layout
│   ├── _dashboardLayout/
│   │   ├── prs/                # PRS routes
│   │   │   ├── my-requests/   # User's requests
│   │   │   ├── inbox/         # Approver inbox
│   │   │   ├── finance/       # Finance inbox
│   │   │   ├── requests/      # Request detail
│   │   │   │   └── $requestId/
│   │   │   ├── requests/new/   # Create request
│   │   │   └── admin/          # Admin routes
│   │   │       ├── teams/
│   │   │       ├── workflows/
│   │   │       ├── form-templates/
│   │   │       └── team-configs/
│   │   └── [other routes]      # Other dashboard routes
└── routeTree.gen.ts            # Generated route tree
```

### Services (`Frontend/services/api/`)

API service modules:

- `auth.ts`: Authentication endpoints
- `prs.ts`: PRS-specific endpoints (requests, teams, workflows, etc.)
- `workflow.ts`: Workflow endpoints (legacy)
- `users.ts`: User management
- `lookups.ts`: Lookup tables
- `audit.ts`: Audit trail
- `accessScopes.ts`: Access scope management
- `organizations.ts`: Organization management (legacy)
- `periods.ts`: Financial periods (legacy)
- `reports.ts`: Reports (legacy)
- `submissions.ts`: Submissions (legacy)
- `review.ts`: Review endpoints (legacy)

### Components (`Frontend/client/`)

React components organized by feature:

- Layout components
- Form components
- Table/list components
- Modal/dialog components
- Page components

### Types (`Frontend/types/`)

TypeScript type definitions:

- `api/`: API response types
- Component prop types
- Utility types

## Key Configuration Files

### Backend Configuration

#### `Backend/Backend/cfowise/settings.py`
Main Django settings:
- Installed apps
- Database configuration
- REST Framework settings
- JWT configuration
- CORS settings
- Security settings
- Logging configuration
- Email configuration

#### `Backend/requirements.txt`
Python dependencies with version constraints.

#### `Backend/pytest.ini`
Pytest configuration for test execution.

### Frontend Configuration

#### `Frontend/package.json`
Node.js dependencies and scripts.

#### `Frontend/tsconfig.json`
TypeScript compiler configuration.

#### `Frontend/vite.config.ts`
Vite build tool configuration.

#### `Frontend/tailwind.config.ts`
TailwindCSS configuration.

#### `Frontend/config.ts`
Application configuration (API URLs, environment settings).

## Environment Variables

### Backend Environment Variables

See `Backend/env.example` for development and `Backend/deployment/env.production.prs.example` for production.

**Required:**
- `SECRET_KEY`: Django secret key
- `DATABASE_URL`: Database connection string
- `DEBUG`: Debug mode (True/False)

**Optional:**
- `ALLOWED_HOSTS`: Comma-separated allowed hosts
- `CORS_ALLOWED_ORIGINS`: Comma-separated CORS origins
- `FORCE_SCRIPT_NAME`: Subpath deployment prefix
- `PRS_COMPLETION_EMAIL`: Email for completion notifications
- `EMAIL_*`: Email server configuration

### Frontend Environment Variables

**Optional:**
- `PUBLIC_API_BASE_URL`: API base URL
- `PUBLIC_ENVIRONMENT`: Environment (LOCAL/DEV/STAGE/PROD)
- `PUBLIC_DEV_API_URL`: Development API URL

## File Naming Conventions

### Backend

- **Models**: `models.py`
- **Views**: `views.py` or `viewsets.py`
- **Serializers**: `serializers.py`
- **Services**: `services.py`
- **Tests**: `tests.py` or `tests/test_*.py`
- **Management commands**: `management/commands/*.py`

### Frontend

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Services**: camelCase (e.g., `authService.ts`)
- **Types**: PascalCase (e.g., `User.ts`)
- **Utils**: camelCase (e.g., `formatDate.ts`)

## Related Documentation

- [Development Setup](05-Development-Setup.md) - Setting up the project
- [Backend Overview](07-Backend-Overview.md) - Backend app details
- [Frontend Overview](11-Frontend-Overview.md) - Frontend structure details

