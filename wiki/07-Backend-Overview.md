# Backend Overview

## Django Application Structure

The PRS backend is built using Django 5.0+ and Django REST Framework, following a modular app-based architecture.

## Installed Apps

### Core Apps

#### `core`
Base models and utilities used across all apps.

**Purpose**: Provides foundational models and utilities.

**Key Components**:
- `BaseModel`: Abstract model with UUID primary key, timestamps, and soft delete
- All other models inherit from `BaseModel`

**Location**: `Backend/core/`

#### `accounts`
User management and authentication.

**Purpose**: Handles user accounts, authentication, and access scopes.

**Key Models**:
- `User`: Custom user model extending Django's AbstractUser
- `AccessScope`: Links users to teams/org nodes with roles

**Key Features**:
- JWT authentication
- Role-based access control
- User-team assignments
- Password management

**Location**: `Backend/accounts/`

#### `classifications`
Lookup tables for system-wide classifications.

**Purpose**: Centralized classification system for dropdowns and lookups.

**Key Models**:
- `LookupType`: Type definitions (e.g., REQUEST_STATUS, PURCHASE_TYPE)
- `Lookup`: Individual lookup values

**Key Features**:
- Type-safe lookups
- Active/inactive status
- Centralized management

**Location**: `Backend/classifications/`

### PRS-Specific Apps

#### `teams`
Team management for PRS.

**Purpose**: Manages organizational teams (Marketing, Tech, Product, etc.).

**Key Models**:
- `Team`: Team definition with name and description

**Key Features**:
- Soft delete (is_active flag)
- Team-user relationships via AccessScope
- Team-specific configurations

**Location**: `Backend/teams/`

#### `workflows`
Workflow template management.

**Purpose**: Defines approval workflows for purchase requests.

**Key Models**:
- `WorkflowTemplate`: Team-agnostic workflow templates
- `WorkflowTemplateStep`: Sequential approval steps
- `WorkflowTemplateStepApprover`: Role-based approver assignments
- Legacy: `Workflow`, `WorkflowStep`, `WorkflowStepApprover` (for backward compatibility)

**Key Features**:
- Template-based workflows (reusable across teams)
- Sequential step progression
- Role-based approver assignment
- Finance review step enforcement

**Location**: `Backend/workflows/`

#### `prs_forms`
Form template management.

**Purpose**: Defines form templates for purchase requests.

**Key Models**:
- `FormTemplate`: Team-agnostic form templates with versioning
- `FormField`: Field definitions (TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN, FILE_UPLOAD)

**Key Features**:
- Template versioning
- Multiple field types
- Required/optional field configuration
- Field ordering

**Location**: `Backend/prs_forms/`

#### `purchase_requests`
Core purchase request logic.

**Purpose**: Main business logic for purchase requests.

**Key Models**:
- `PurchaseRequest`: Main request entity
- `RequestFieldValue`: Form field values

**Key Features**:
- Request lifecycle management
- Status transitions
- Workflow integration
- Field value storage

**Location**: `Backend/purchase_requests/`

**Key Files**:
- `models.py`: Data models
- `views.py`: API endpoints
- `serializers.py`: Data serialization
- `services.py`: Business logic

#### `attachments`
File attachment management.

**Purpose**: Handles file uploads and storage.

**Key Models**:
- `Attachment`: File attachments
- `AttachmentCategory`: Team-specific attachment categories

**Key Features**:
- File type validation
- Size limits (10 MB per file)
- Category-based organization
- Versioned storage

**Location**: `Backend/attachments/`

#### `approvals`
Approval history tracking.

**Purpose**: Records all approval/rejection actions.

**Key Models**:
- `ApprovalHistory`: Approval/rejection records

**Key Features**:
- Complete approval history
- Timestamps and comments
- Support for both legacy and template-based steps

**Location**: `Backend/approvals/`

#### `prs_team_config`
Team-specific configuration.

**Purpose**: Maps teams and purchase types to form/workflow templates.

**Key Models**:
- `TeamPurchaseConfig`: Configuration mapping (team + purchase_type → templates)

**Key Features**:
- Team-specific template selection
- Purchase type-based configuration
- Active configuration enforcement

**Location**: `Backend/prs_team_config/`

#### `audit`
Audit trail system.

**Purpose**: Tracks all changes for compliance and accountability.

**Key Models**:
- `AuditEvent`: Audit events
- `FieldChange`: Field-level change tracking

**Key Features**:
- Level 2 field-level audit logging
- Immutable audit records
- Complete change history

**Location**: `Backend/audit/`

### Legacy Apps (CFO Wise)

These apps remain for data preservation but are not actively used in PRS:

- `org/`: Organization structure
- `periods/`: Financial periods
- `reports/`: Report definitions
- `submissions/`: Report submissions

## Django Settings

### Key Configuration

**Location**: `Backend/Backend/cfowise/settings.py`

**Key Settings**:
- `INSTALLED_APPS`: List of installed Django apps
- `DATABASES`: Database configuration (PostgreSQL/SQLite)
- `REST_FRAMEWORK`: DRF configuration
- `SIMPLE_JWT`: JWT authentication settings
- `CORS_ALLOWED_ORIGINS`: CORS configuration
- `AUTH_USER_MODEL`: Custom user model

### Environment-Based Configuration

Settings are configured via environment variables:
- `DEBUG`: Debug mode
- `SECRET_KEY`: Django secret key
- `DATABASE_URL`: Database connection string
- `ALLOWED_HOSTS`: Allowed hostnames
- `CORS_ALLOWED_ORIGINS`: CORS origins

## URL Routing

### Main URL Configuration

**Location**: `Backend/Backend/cfowise/urls.py`

**URL Patterns**:
- `/admin/`: Django admin interface
- `/health`: Health check endpoint
- `/api/auth/token/`: JWT token obtain
- `/api/auth/token/refresh/`: JWT token refresh
- `/api/auth/token/verify/`: JWT token verify
- `/api/me/`: Current user info
- `/api/`: API router (includes all ViewSets)

### API Endpoints

See [API Endpoints](09-API-Endpoints.md) for complete endpoint documentation.

## Authentication & Authorization

### JWT Authentication

- Uses `djangorestframework-simplejwt`
- Access tokens: 60 minutes lifetime
- Refresh tokens: 7 days lifetime
- Token rotation enabled

### Permission Classes

- `IsAuthenticated`: Default permission (requires valid JWT)
- Custom permissions for role-based access
- Resource-level permissions for ownership checks

### Access Control

- **AccessScope**: Links users to teams with roles
- **Role-Based**: Permissions based on COMPANY_ROLE lookups
- **Resource-Based**: Ownership and team membership checks

## Serializers

### Purpose

Serializers handle:
- Data validation
- Data transformation (model ↔ JSON)
- Nested relationships
- Read/write operations

### Key Serializers

- `PurchaseRequestSerializer`: Request serialization
- `FormTemplateSerializer`: Form template serialization
- `WorkflowTemplateSerializer`: Workflow serialization
- `UserSerializer`: User serialization
- `TeamSerializer`: Team serialization

## Services Layer

### Purpose

Business logic is separated into services for:
- Reusability
- Testability
- Separation of concerns

### Key Services

**Location**: `Backend/purchase_requests/services.py`

**Key Functions**:
- `get_current_step()`: Get current workflow step
- `ensure_user_is_step_approver()`: Permission validation
- `have_all_approvers_approved()`: Approval checking
- `validate_required_fields()`: Field validation
- `validate_required_attachments()`: Attachment validation
- `send_completion_email()`: Email notifications
- Workflow progression functions

## Database

### Database Engine

- **Development**: SQLite (default)
- **Production**: PostgreSQL (required)

### Migrations

- Django migrations for schema changes
- Run with: `python manage.py migrate`
- Create with: `python manage.py makemigrations`

### Soft Deletes

All models use `is_active` flag instead of physical deletion:
- Records are never deleted
- `is_active=False` marks records as inactive
- Queries filter by `is_active=True` by default

## Admin Interface

### Django Admin

Access at `/admin/` with superuser credentials.

**Features**:
- Model CRUD operations
- User management
- Lookup table management
- Request viewing (read-only recommended)

## Logging

### Configuration

**Location**: `Backend/Backend/cfowise/settings.py`

**Log Levels**:
- Development: DEBUG
- Production: INFO

**Log Handlers**:
- Console: Development
- File: Production (rotating logs)

## Related Documentation

- [Data Models](08-Data-Models.md) - Detailed model documentation
- [API Endpoints](09-API-Endpoints.md) - API endpoint details
- [Services & Business Logic](10-Services-Business-Logic.md) - Service layer details
- [Development Setup](05-Development-Setup.md) - Setup instructions


