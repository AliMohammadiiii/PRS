# API Endpoints

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: Configured via `CORS_ALLOWED_ORIGINS`

## Authentication

All API endpoints (except authentication endpoints) require JWT authentication.

### Authentication Headers

```
Authorization: Bearer <access_token>
```

### Token Endpoints

#### POST `/api/auth/token/`

Obtain JWT access and refresh tokens.

**Request Body**:
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Error Responses**:
- `400 Bad Request`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded

#### POST `/api/auth/token/refresh/`

Refresh access token using refresh token.

**Request Body**:
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response** (200 OK):
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### POST `/api/auth/token/verify/`

Verify token validity.

**Request Body**:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response** (200 OK):
```json
{}
```

**Error Response** (401 Unauthorized):
```json
{
  "detail": "Token is invalid or expired"
}
```

#### GET `/api/me/`

Get current authenticated user information.

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "user@example.com",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "access_scopes": [
    {
      "id": "...",
      "team": {
        "id": "...",
        "name": "Marketing"
      },
      "role": {
        "code": "INITIATOR",
        "name": "Initiator"
      }
    }
  ]
}
```

#### POST `/api/auth/change-password/`

Change user password.

**Request Body**:
```json
{
  "old_password": "oldpassword",
  "new_password": "newpassword"
}
```

**Response** (200 OK):
```json
{
  "detail": "Password changed successfully"
}
```

## Purchase Request Endpoints

### Base Endpoint

`/api/prs/requests/`

### List Requests

#### GET `/api/prs/requests/`

List purchase requests (filtered by user permissions).

**Query Parameters**:
- `status`: Filter by status code (e.g., `DRAFT`, `PENDING_APPROVAL`)
- `team`: Filter by team ID
- `requestor`: Filter by requestor ID
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 25)

**Response** (200 OK):
```json
{
  "count": 100,
  "next": "http://api.example.com/api/prs/requests/?page=2",
  "previous": null,
  "results": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "requestor": {
        "id": "...",
        "username": "user@example.com"
      },
      "team": {
        "id": "...",
        "name": "Marketing"
      },
      "status": {
        "code": "DRAFT",
        "name": "Draft"
      },
      "subject": "Purchase Office Supplies",
      "vendor_name": "Office Depot",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Permissions**:
- Regular users: Only their own requests
- Admins: All requests

### Get Request Details

#### GET `/api/prs/requests/{id}/`

Get detailed information about a purchase request.

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "requestor": {
    "id": "...",
    "username": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "team": {
    "id": "...",
    "name": "Marketing"
  },
  "form_template": {
    "id": "...",
    "name": "Marketing Form",
    "version_number": 1
  },
  "workflow_template": {
    "id": "...",
    "name": "Standard Workflow",
    "version_number": 1
  },
  "status": {
    "code": "IN_REVIEW",
    "name": "In Review"
  },
  "current_template_step": {
    "id": "...",
    "step_name": "Manager Approval",
    "step_order": 1
  },
  "vendor_name": "Office Depot",
  "vendor_account": "1234567890",
  "subject": "Purchase Office Supplies",
  "description": "Need to purchase office supplies for Q1",
  "purchase_type": {
    "code": "GOODS",
    "name": "Goods"
  },
  "field_values": [
    {
      "field": {
        "id": "...",
        "field_id": "budget_amount",
        "name": "Budget Amount",
        "field_type": "NUMBER"
      },
      "value_number": "5000.00"
    }
  ],
  "attachments": [
    {
      "id": "...",
      "filename": "invoice.pdf",
      "file_size": 102400,
      "upload_date": "2025-01-15T10:30:00Z"
    }
  ],
  "approval_history": [
    {
      "id": "...",
      "template_step": {
        "step_name": "Manager Approval",
        "step_order": 1
      },
      "approver": {
        "username": "manager@example.com"
      },
      "action": "APPROVE",
      "comment": "Approved",
      "timestamp": "2025-01-15T11:00:00Z"
    }
  ],
  "submitted_at": "2025-01-15T10:35:00Z",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

**Permissions**:
- Requestor: Can view own requests
- Approvers: Can view requests at their assigned steps
- Admins: Can view all requests

### Create Request

#### POST `/api/prs/requests/`

Create a new purchase request (DRAFT status).

**Request Body**:
```json
{
  "team": "123e4567-e89b-12d3-a456-426614174000",
  "purchase_type": "GOODS",
  "vendor_name": "Office Depot",
  "vendor_account": "1234567890",
  "subject": "Purchase Office Supplies",
  "description": "Need to purchase office supplies for Q1",
  "field_values": {
    "budget_amount": "5000.00"
  }
}
```

**Response** (201 Created):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": {
    "code": "DRAFT",
    "name": "Draft"
  },
  ...
}
```

**Permissions**:
- User must belong to the specified team
- User must have INITIATOR role for the team

### Update Request

#### PATCH `/api/prs/requests/{id}/`

Update a purchase request (only in DRAFT, REJECTED, or RESUBMITTED status).

**Request Body**:
```json
{
  "vendor_name": "Updated Vendor Name",
  "subject": "Updated Subject",
  "field_values": {
    "budget_amount": "6000.00"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "...",
  "vendor_name": "Updated Vendor Name",
  ...
}
```

**Permissions**:
- Only the requestor can update
- Request must be in editable status

**Error Responses**:
- `400 Bad Request`: Invalid status for editing
- `403 Forbidden`: Not the requestor

### Submit Request

#### POST `/api/prs/requests/{id}/submit/`

Submit a purchase request for approval.

**Request Body** (optional files):
```
Content-Type: multipart/form-data

files: [file1, file2, ...]
```

**Response** (200 OK):
```json
{
  "id": "...",
  "status": {
    "code": "PENDING_APPROVAL",
    "name": "Pending Approval"
  },
  "submitted_at": "2025-01-15T10:35:00Z"
}
```

**Validations**:
- All required fields must be filled
- All required attachments must be uploaded
- Request must be in DRAFT, REJECTED, or RESUBMITTED status

**Permissions**:
- Only the requestor can submit

### Approve Request

#### POST `/api/prs/requests/{id}/approve/`

Approve a purchase request at the current workflow step.

**Request Body**:
```json
{
  "comment": "Approved - looks good"
}
```

**Response** (200 OK):
```json
{
  "id": "...",
  "status": {
    "code": "IN_REVIEW",
    "name": "In Review"
  },
  "current_template_step": {
    "step_order": 2,
    "step_name": "Director Approval"
  }
}
```

**Validations**:
- User must be assigned as approver for current step
- All approvers at the step must approve (AND logic)
- Request must be at the correct step

**Permissions**:
- User must be approver for current step
- Cannot approve own requests

### Reject Request

#### POST `/api/prs/requests/{id}/reject/`

Reject a purchase request.

**Request Body**:
```json
{
  "comment": "Rejected - budget exceeds limit"
}
```

**Response** (200 OK):
```json
{
  "id": "...",
  "status": {
    "code": "REJECTED",
    "name": "Rejected"
  },
  "rejection_comment": "Rejected - budget exceeds limit"
}
```

**Validations**:
- Comment is required (minimum 10 characters)
- User must be approver for current step
- Request can be rejected at any approval step

**Permissions**:
- User must be approver for current step

### Complete Request (Finance)

#### POST `/api/prs/requests/{id}/complete/`

Mark a purchase request as completed (Finance only).

**Request Body** (optional):
```json
{
  "comment": "Payment processed"
}
```

**Response** (200 OK):
```json
{
  "id": "...",
  "status": {
    "code": "COMPLETED",
    "name": "Completed"
  },
  "completed_at": "2025-01-15T12:00:00Z"
}
```

**Validations**:
- Request must be in FINANCE_REVIEW status
- User must have Finance Reviewer role

**Permissions**:
- User must have Finance Reviewer role

**Side Effects**:
- Sends completion email to configured address

### Inbox Endpoints

#### GET `/api/prs/requests/inbox/`

Get requests pending approval for current user.

**Query Parameters**:
- `page`: Page number
- `page_size`: Items per page

**Response** (200 OK):
```json
{
  "count": 5,
  "results": [
    {
      "id": "...",
      "subject": "Purchase Request",
      "current_template_step": {
        "step_name": "Manager Approval"
      },
      "requestor": {
        "username": "user@example.com"
      }
    }
  ]
}
```

#### GET `/api/prs/requests/finance-inbox/`

Get requests pending finance review.

**Response** (200 OK):
```json
{
  "count": 3,
  "results": [
    {
      "id": "...",
      "subject": "Purchase Request",
      "status": {
        "code": "FULLY_APPROVED"
      }
    }
  ]
}
```

**Permissions**:
- User must have Finance Reviewer role

## Team Endpoints

### Base Endpoint

`/api/prs/teams/`

### List Teams

#### GET `/api/prs/teams/`

List all active teams.

**Response** (200 OK):
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Marketing",
    "description": "Marketing team",
    "is_active": true
  }
]
```

### Get Team

#### GET `/api/prs/teams/{id}/`

Get team details.

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Marketing",
  "description": "Marketing team",
  "is_active": true
}
```

## Form Template Endpoints

### Base Endpoint

`/api/prs/form-templates/`

### List Form Templates

#### GET `/api/prs/form-templates/`

List all form templates.

**Response** (200 OK):
```json
[
  {
    "id": "...",
    "name": "Marketing Form",
    "version_number": 1,
    "fields": [
      {
        "id": "...",
        "field_id": "budget_amount",
        "name": "Budget Amount",
        "field_type": "NUMBER",
        "required": true,
        "order": 1
      }
    ]
  }
]
```

### Get Form Template

#### GET `/api/prs/form-templates/{id}/`

Get form template details.

**Response** (200 OK):
```json
{
  "id": "...",
  "name": "Marketing Form",
  "version_number": 1,
  "fields": [...]
}
```

## Workflow Template Endpoints

### Base Endpoint

`/api/prs/workflows/`

### List Workflow Templates

#### GET `/api/prs/workflows/`

List all workflow templates.

**Response** (200 OK):
```json
[
  {
    "id": "...",
    "name": "Standard Workflow",
    "version_number": 1,
    "steps": [
      {
        "id": "...",
        "step_name": "Manager Approval",
        "step_order": 1,
        "is_finance_review": false,
        "approvers": [
          {
            "role": {
              "code": "MANAGER",
              "name": "Manager"
            }
          }
        ]
      }
    ]
  }
]
```

## Attachment Endpoints

### Upload Attachment

#### POST `/api/prs/requests/{id}/attachments/`

Upload an attachment to a purchase request.

**Request** (multipart/form-data):
```
file: <file>
category: "Invoice" (optional)
```

**Response** (201 Created):
```json
{
  "id": "...",
  "filename": "invoice.pdf",
  "file_size": 102400,
  "file_type": "application/pdf",
  "upload_date": "2025-01-15T10:30:00Z"
}
```

**Validations**:
- File size: Max 10 MB
- File types: PDF, JPG, JPEG, PNG, DOCX, XLSX, XLS

### Download Attachment

#### GET `/api/prs/attachments/{id}/download/`

Download an attachment file.

**Response** (200 OK):
- Content-Type: Based on file type
- Content-Disposition: attachment; filename="invoice.pdf"
- File content

**Permissions**:
- Requestor, approvers, finance reviewers, admins

## User Endpoints

### Base Endpoint

`/api/users/`

### List Users

#### GET `/api/users/`

List users (admin only).

**Query Parameters**:
- `page`: Page number
- `page_size`: Items per page

**Response** (200 OK):
```json
{
  "count": 50,
  "results": [
    {
      "id": "...",
      "username": "user@example.com",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_active": true
    }
  ]
}
```

**Permissions**:
- Admin only

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error message"
}
```

### Validation Error Format

```json
{
  "field_name": ["Error message"],
  "another_field": ["Error message"]
}
```

### Common Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

- **Authentication endpoints**: Stricter limits (see settings)
- **API endpoints**: 1000 requests/hour per user
- **Anonymous**: 100 requests/hour

## Pagination

List endpoints use page-based pagination:

- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 25, max: 100)

**Response Format**:
```json
{
  "count": 100,
  "next": "http://api.example.com/api/prs/requests/?page=2",
  "previous": null,
  "results": [...]
}
```

## OpenAPI Documentation

Interactive API documentation available at:
- Swagger UI: `/api/docs/`
- ReDoc: `/api/redoc/`
- OpenAPI Schema: `/api/schema/`

## Related Documentation

- [Services & Business Logic](10-Services-Business-Logic.md) - Business logic details
- [Authentication](20-Security.md) - Security details
- [Frontend Services](13-Services-State-Management.md) - Frontend API usage







