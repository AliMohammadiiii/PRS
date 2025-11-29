# Architecture Overview

## System Architecture

The Purchase Request System follows a modern three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  React 19 + TypeScript + TanStack Router + TanStack Query   │
│                    (SPA with SSR support)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST API
                        │ JWT Authentication
┌───────────────────────▼─────────────────────────────────────┐
│                      Backend Layer                          │
│  Django 5.0 + Django REST Framework + JWT Authentication    │
│              (RESTful API + Business Logic)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │ ORM Queries
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                     Database Layer                          │
│         PostgreSQL (Production) / SQLite (Dev)            │
│              (Relational Data + File Storage)               │
└─────────────────────────────────────────────────────────────┘
```

## High-Level Component Overview

### Frontend Components

```
Frontend Application
├── Routes (TanStack Router)
│   ├── Authentication Routes
│   ├── Dashboard Routes
│   ├── PRS Routes
│   │   ├── My Requests
│   │   ├── Inbox (Approver)
│   │   ├── Finance Inbox
│   │   ├── Request Detail
│   │   └── Admin Routes
│   └── Other Routes
├── Services (API Client)
│   ├── Auth Service
│   ├── PRS Service
│   ├── Workflow Service
│   └── User Service
├── Components (UI)
│   ├── Layout Components
│   ├── Form Components
│   ├── Table Components
│   └── Modal Components
└── State Management
    ├── Auth Context
    └── React Query Cache
```

### Backend Components

```
Backend Application
├── Django Apps
│   ├── accounts (User Management)
│   ├── teams (Team Management)
│   ├── workflows (Workflow Templates)
│   ├── prs_forms (Form Templates)
│   ├── purchase_requests (Core Request Logic)
│   ├── attachments (File Management)
│   ├── approvals (Approval History)
│   ├── audit (Audit Trail)
│   ├── classifications (Lookup Tables)
│   └── prs_team_config (Team Configuration)
├── Services Layer
│   └── purchase_requests.services (Business Logic)
├── API Layer
│   └── REST API Viewsets
└── Data Layer
    └── Django ORM Models
```

## Backend Architecture

### Django REST Framework Structure

The backend follows Django REST Framework best practices:

- **Models**: Data layer with Django ORM
- **Serializers**: Data validation and transformation
- **Views/ViewSets**: API endpoint handlers
- **Services**: Business logic separation
- **Permissions**: Role-based access control
- **Authentication**: JWT token-based auth

### Key Design Patterns

1. **Repository Pattern**: Services layer abstracts data access
2. **Service Layer Pattern**: Business logic separated from views
3. **Soft Delete Pattern**: `is_active` flag instead of physical deletion
4. **UUID Primary Keys**: All models use UUID for safer merges
5. **Template Pattern**: Workflow and form templates for reusability

### Database Architecture

- **Relational Database**: PostgreSQL for production, SQLite for development
- **Soft Deletes**: All models use `is_active` flag
- **Audit Trail**: Separate audit models track all changes
- **File Storage**: Media files stored on filesystem (configurable to cloud storage)

## Frontend Architecture

### React Application Structure

The frontend uses modern React patterns:

- **Component-Based**: Reusable UI components
- **Route-Based**: TanStack Router for navigation
- **State Management**: React Query for server state, Context for auth
- **Type Safety**: TypeScript throughout
- **Build Tool**: Vite for fast development and optimized builds

### Key Patterns

1. **Container/Presenter Pattern**: Separation of logic and presentation
2. **Custom Hooks**: Reusable logic extraction
3. **Service Layer**: API calls abstracted into services
4. **Context API**: Global state for authentication
5. **React Query**: Server state management and caching

## Authentication & Authorization Flow

```
User Login
    │
    ├─► POST /api/auth/token/
    │   └─► Returns JWT Access + Refresh Tokens
    │
    ├─► Store Tokens in sessionStorage
    │
    ├─► Include Token in API Requests
    │   └─► Authorization: Bearer <token>
    │
    ├─► Backend Validates Token
    │   └─► JWT Authentication Middleware
    │
    └─► Token Refresh (when expired)
        └─► POST /api/auth/token/refresh/
```

### Authorization Levels

1. **Public**: No authentication required (health check)
2. **Authenticated**: Valid JWT token required
3. **Role-Based**: Specific roles required (via AccessScope)
4. **Resource-Based**: Ownership or team membership required

## Request Lifecycle Flow

```
Request Creation
    │
    ├─► User Creates Draft Request
    │   └─► Status: DRAFT
    │
    ├─► User Submits Request
    │   └─► Status: PENDING_APPROVAL
    │   └─► Moves to First Workflow Step
    │
    ├─► Workflow Progression
    │   ├─► Status: IN_REVIEW (Step X)
    │   ├─► Approver Reviews & Approves
    │   ├─► All Approvers Approve → Next Step
    │   └─► Repeat until Final Step
    │
    ├─► Final Approval
    │   └─► Status: FULLY_APPROVED
    │   └─► Moves to Finance Review
    │
    ├─► Finance Review
    │   └─► Status: FINANCE_REVIEW
    │   └─► Finance Completes Request
    │
    └─► Completion
        └─► Status: COMPLETED
        └─► Email Sent to Organization
        └─► Request Becomes Read-Only
```

## Data Flow

### Request Creation Flow

```
Frontend Form
    │
    ├─► User Fills Form Fields
    ├─► User Uploads Attachments
    │
    ├─► POST /api/prs/requests/
    │   └─► Backend Validates Data
    │   └─► Creates PurchaseRequest
    │   └─► Creates RequestFieldValues
    │   └─► Creates Attachments
    │   └─► Creates Audit Event
    │
    └─► Returns Created Request
```

### Approval Flow

```
Approver Action
    │
    ├─► Approver Reviews Request
    │
    ├─► POST /api/prs/requests/{id}/approve/
    │   └─► Backend Validates Permission
    │   └─► Creates ApprovalHistory Entry
    │   └─► Checks if All Approvers Approved
    │   ├─► If Yes: Move to Next Step
    │   └─► If No: Wait for Other Approvers
    │   └─► Creates Audit Event
    │
    └─► Returns Updated Request
```

## Deployment Architecture

### Production Deployment

```
Internet
    │
    ├─► Nginx (Reverse Proxy)
    │   ├─► SSL/TLS Termination
    │   ├─► Static File Serving
    │   └─► API Request Routing
    │
    ├─► Gunicorn (WSGI Server)
    │   └─► Django Application
    │       ├─► Multiple Workers
    │       └─► Process Pool
    │
    ├─► PostgreSQL Database
    │   └─► Persistent Data Storage
    │
    └─► File System / Cloud Storage
        └─► Media Files (Attachments)
```

### Scalability Considerations

- **Horizontal Scaling**: Multiple Gunicorn workers
- **Database**: PostgreSQL supports connection pooling
- **File Storage**: Can be migrated to cloud storage (S3, etc.)
- **Caching**: Can add Redis for session/cache storage
- **Load Balancing**: Nginx can be fronted by load balancer

## Security Architecture

### Security Layers

1. **Network Layer**: HTTPS/TLS encryption
2. **Application Layer**: JWT authentication, CSRF protection
3. **Data Layer**: Parameterized queries, input validation
4. **File Layer**: File type validation, size limits
5. **Access Layer**: Role-based permissions, resource-level checks

### Security Measures

- JWT tokens with expiration
- Password hashing (bcrypt/argon2)
- CORS configuration
- Security headers (HSTS, X-Frame-Options, etc.)
- Input validation and sanitization
- SQL injection prevention (ORM)
- XSS prevention (output encoding)

## Related Documentation

- [Technology Stack](03-Technology-Stack.md) - Technologies used
- [Backend Overview](07-Backend-Overview.md) - Backend details
- [Frontend Overview](11-Frontend-Overview.md) - Frontend details
- [Deployment](19-Deployment.md) - Deployment architecture

