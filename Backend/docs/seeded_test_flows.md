## Seeded PRS test flows (manual scenarios)

This document shows concrete API calls that match the data created by
`manage.py seed_manual_scenarios_data`.

All example users have password `testpass123`.

- requester_user
- requester_user_B
- requester_user_RnD
- approver1_user
- approver2_user
- approver_user
- finance_user
- admin_user
- non_approver_user

### 1. S02 – Create new purchase request (Team A / Marketing)

- **User**: `requester_user`
- **Team**: `Marketing` (Team A)

1) Authenticate and obtain token (example)

```http
POST /api/auth/token/
Content-Type: application/json

{
  "username": "requester_user",
  "password": "testpass123"
}
```

2) Create draft request (equivalent to REQ_A_DRAFT but via API)

```http
POST /api/prs/requests/
Authorization: Bearer <token>
Content-Type: application/json

{
  "team_id": "<TEAM_A_ID>",          // id of team named "Marketing"
  "vendor_name": "ACME Media Agency",
  "vendor_account": "IR-123-456-789-0",
  "subject": "Q2 Social Campaign",
  "description": "Paid media for Q2 launch",
  "purchase_type": "SERVICE"
}
```

The seeding command also creates a similar draft record with subject
`REQ_A_DRAFT – Q2 Social Campaign` for use in S05.

3) Fill required dynamic fields on created request

Look up the template for Marketing:

```http
GET /api/prs/teams/<TEAM_A_ID>/form-template/
Authorization: Bearer <token>
```

The seeding command guarantees at least these two fields:

- `BUDGET_AMOUNT` (NUMBER, required)
- `CAMPAIGN_NAME` (TEXT, required)

Update the request’s field values:

```http
PATCH /api/prs/requests/{REQUEST_ID}/
Authorization: Bearer <token>
Content-Type: application/json

{
  "field_values": [
    {
      "field_id": "BUDGET_AMOUNT",
      "value_number": "5000000"
    },
    {
      "field_id": "CAMPAIGN_NAME",
      "value_text": "Spring Campaign 1404"
    }
  ]
}
```

### 2. S04 – Multi-level approval workflow (Team A / Marketing)

The command configures:

- Team A (Marketing) workflow `Team A Workflow`
- Step 1: `Manager Approval` (role `APPROVER_MANAGER`, used by `approver1_user`)
- Step 2: `Director Approval` (role `APPROVER_DIRECTOR`, used by `approver2_user`)

1) Submit an existing draft (e.g. REQ_A_DRAFT) for approval

```http
POST /api/prs/requests/{REQUEST_ID}/submit/
Authorization: Bearer <token of requester_user>
Content-Type: application/json

{}
```

Expected:

- status changes from `DRAFT` → `PENDING_APPROVAL`
- `current_step` set to step 1 (Manager Approval)

2) Approver 1 sees it in My Approvals

```http
GET /api/prs/requests/my-approvals/
Authorization: Bearer <token of approver1_user>
```

3) Approver 1 approves

```http
POST /api/prs/requests/{REQUEST_ID}/approve/
Authorization: Bearer <token of approver1_user>
Content-Type: application/json

{}
```

Expected:

- `current_step` moves to step 2 (Director Approval)
- status typically remains `IN_REVIEW`

4) Approver 2 approves

```http
POST /api/prs/requests/{REQUEST_ID}/approve/
Authorization: Bearer <token of approver2_user>
Content-Type: application/json

{}
```

Expected:

- status becomes `FULLY_APPROVED`
- `current_step` is `null`

Negative checks from the manual doc can be executed by calling the same
`/approve/` endpoint as:

- `non_approver_user` (should get 403)
- `approver1_user` again after step 1 is done
- any approver when the status is not approvable (e.g. `DRAFT` or `COMPLETED`)

### 3. S05 – Admin visibility

The command creates example requests:

- `REQ_A_DRAFT – Q2 Social Campaign` (Team A, status `DRAFT`)
- `REQ_A_PENDING – Multi-level approval test` (Team A, status `PENDING_APPROVAL`)
- `REQ_B_COMPLETED – Tech Infra Purchase` (Team B, status `COMPLETED`)
- `REQ_FINANCE – Finance review in progress` (R&D, status `FINANCE_REVIEW`)

You can locate them via:

```http
GET /api/prs/requests/?subject__icontains=REQ_
Authorization: Bearer <token of admin_user>
```

Example calls for the sub-scenarios:

- List all requests

```http
GET /api/prs/requests/
Authorization: Bearer <token of admin_user>
```

- View details

```http
GET /api/prs/requests/{id-of-REQ_A_DRAFT}/
GET /api/prs/requests/{id-of-REQ_B_COMPLETED}/
Authorization: Bearer <token of admin_user>
```

- Attempt delete (should be rejected by business rule)

```http
DELETE /api/prs/requests/{id-of-REQ_A_DRAFT}/
Authorization: Bearer <token of admin_user>
```

- Attempt approve as admin when not a step approver

```http
POST /api/prs/requests/{id-of-REQ_A_PENDING}/approve/
Authorization: Bearer <token of admin_user>
Content-Type: application/json

{}
```

- Finance completion negative case (`REQ_FINANCE`)

```http
POST /api/prs/requests/{id-of-REQ_FINANCE}/complete/
Authorization: Bearer <token of admin_user>
Content-Type: application/json

{}
```

### 4. S06–S10 – Admin configuration & end-to-end

The seed command ensures:

- Teams exist: `Marketing`, `Tech`, `Data Science`, `Product`, `R&D`
- Each team has an active `FormTemplate`
- Workflows:
  - Marketing: Manager → Director (no finance)
  - Tech: Manager → Finance
  - R&D: Manager → Finance

Example admin calls:

- Create new team

```http
POST /api/teams/
Authorization: Bearer <token of admin_user>
Content-Type: application/json

{
  "name": "New Team",
  "description": "Example team",
  "is_active": true
}
```

- List PRS teams for configuration

```http
GET /api/prs/teams/
Authorization: Bearer <token of admin_user>
```

For S10-01 you can reuse the seeded `R&D` team:

1) As `requester_user_RnD` create and submit a request for `R&D`.
2) As `approver_user` (generic approver) approve step 1.
3) As `finance_user` complete finance review (step 2).

### 5. UA-01–UA-10 – Authentication & roles

The seed command guarantees that:

- `requester_user` has AccessScope as REQUESTER on Marketing
- `approver1_user`, `approver2_user`, `approver_user` have approver roles
  on at least one team, so `/my-approvals/` returns data once workflows are used
- `admin_user` is a Django staff/superuser and has ADMIN access scopes

Example JWT token request for any seeded user:

```http
POST /api/auth/token/
Content-Type: application/json

{
  "username": "<seeded-username>",
  "password": "testpass123"
}
```

You can then exercise the UI/route-level tests from the manual
`User Authentication & Role-Based Access` document using those accounts.




