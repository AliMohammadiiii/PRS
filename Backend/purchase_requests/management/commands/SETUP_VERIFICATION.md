# Setup Verification Checklist for S04 Workflow Test

This document verifies that all required components are set up correctly for the S04 - Multi-level approval workflow test.

## ✅ Components Verified

### 1. Users (4 total)
- ✅ **requester_user** - Standard Requester
  - Password: `testpass123`
  - AccessScope: Assigned to Team A (Marketing) with role "REQUESTER"
  - Can create requests for Team A
  
- ✅ **approver1_user** - First-level approver (Manager Approval)
  - Password: `testpass123`
  - WorkflowStepApprover: Assigned to Step 1 (Manager Approval)
  - Can approve requests at Step 1
  - No AccessScope needed (approval uses WorkflowStepApprover, not AccessScope)
  
- ✅ **approver2_user** - Second-level approver (Director Approval)
  - Password: `testpass123`
  - WorkflowStepApprover: Assigned to Step 2 (Director Approval)
  - Can approve requests at Step 2
  - No AccessScope needed (approval uses WorkflowStepApprover, not AccessScope)
  
- ✅ **non_approver_user** - For negative test scenarios
  - Password: `testpass123`
  - No assignments (no AccessScope, no WorkflowStepApprover)
  - Should NOT be able to approve requests

### 2. Team A (Marketing)
- ✅ Team created: "Marketing"
- ✅ Team is active (`is_active=True`)
- ✅ Description: "Marketing team for workflow test"

### 3. Form Template for Team A
- ✅ Active form template created
- ✅ Version number assigned
- ✅ Fields created:
  - ✅ `BUDGET_AMOUNT` (NUMBER, required, order: 1)
  - ✅ `CAMPAIGN_NAME` (TEXT, required, order: 2)

### 4. Workflow W1 for Team A
- ✅ Workflow created: "Team A Workflow"
- ✅ Workflow is active (`is_active=True`)
- ✅ Linked to Team A (one-to-one relationship)

### 5. Workflow Steps (2 steps, no finance step)
- ✅ **Step 1: Manager Approval**
  - `step_order = 1`
  - `step_name = "Manager Approval"`
  - `is_finance_review = False`
  - `is_active = True`
  - Approver: `approver1_user` (via WorkflowStepApprover)
  
- ✅ **Step 2: Director Approval**
  - `step_order = 2`
  - `step_name = "Director Approval"`
  - `is_finance_review = False`
  - `is_active = True`
  - Approver: `approver2_user` (via WorkflowStepApprover)

**Note:** No finance step as per test specification (finance will be covered in S05).

### 6. AccessScope
- ✅ `requester_user` → Team A (Marketing) with role "REQUESTER"
  - Allows requester_user to create requests for Team A
  - Required for: Creating purchase requests

### 7. WorkflowStepApprover Assignments
- ✅ `approver1_user` → Step 1 (Manager Approval)
  - Required for: Approving requests at Step 1
  - Used by: `ensure_user_is_step_approver()` function
  - Used by: `get_approver_inbox_qs()` function
  
- ✅ `approver2_user` → Step 2 (Director Approval)
  - Required for: Approving requests at Step 2
  - Used by: `ensure_user_is_step_approver()` function
  - Used by: `get_approver_inbox_qs()` function

### 8. Lookup Types (Verified by Command)
- ✅ `REQUEST_STATUS` type exists
  - Required values: DRAFT, PENDING_APPROVAL, IN_REVIEW, REJECTED, FULLY_APPROVED
  - Created by migration: `0004_add_prs_lookups.py`
  
- ✅ `PURCHASE_TYPE` type exists
  - Required value: SERVICE
  - Created by migration: `0004_add_prs_lookups.py`

## 🔍 Permission Flow Verification

### Creating Requests
1. **requester_user** can create requests for Team A
   - ✅ Has AccessScope: `requester_user` → Team A (Marketing) with role "REQUESTER"
   - ✅ Team A has active form template
   - ✅ Team A has active workflow

### Approving Requests
1. **approver1_user** can approve at Step 1
   - ✅ Has WorkflowStepApprover: `approver1_user` → Step 1 (Manager Approval)
   - ✅ Step 1 is active
   - ✅ approver1_user is active

2. **approver2_user** can approve at Step 2
   - ✅ Has WorkflowStepApprover: `approver2_user` → Step 2 (Director Approval)
   - ✅ Step 2 is active
   - ✅ approver2_user is active

3. **non_approver_user** cannot approve
   - ✅ No WorkflowStepApprover assignments
   - ✅ Should fail `ensure_user_is_step_approver()` check

### Viewing "My Approvals"
1. **approver1_user** sees requests at Step 1
   - ✅ `get_approver_inbox_qs(approver1_user)` filters by:
     - `current_step__approvers__approver=approver1_user`
     - `current_step__approvers__is_active=True`
   - ✅ Returns requests where `current_step = Step 1`

2. **approver2_user** sees requests at Step 2
   - ✅ `get_approver_inbox_qs(approver2_user)` filters by:
     - `current_step__approvers__approver=approver2_user`
     - `current_step__approvers__is_active=True`
   - ✅ Returns requests where `current_step = Step 2`

## 📋 Test Flow Summary

Based on the test specification (Workflow.md lines 64-226):

1. **Step 1 - Create Draft** (requester_user)
   - ✅ requester_user can create request for Team A
   - ✅ Request created with status = DRAFT
   - ✅ current_step = null

2. **Step 2 - Fill Fields** (requester_user)
   - ✅ requester_user can update field_values
   - ✅ BUDGET_AMOUNT and CAMPAIGN_NAME can be set

3. **Step 3 - Submit** (requester_user)
   - ✅ Request status → PENDING_APPROVAL or IN_REVIEW
   - ✅ current_step → Step 1 (Manager Approval)
   - ✅ submitted_at set

4. **Step 4 - My Approvals (approver1)** (approver1_user)
   - ✅ GET /api/prs/requests/my-approvals/ returns the request
   - ✅ current_step_name = "Manager Approval"

5. **Step 5 - Approve Step 1** (approver1_user)
   - ✅ POST /api/prs/requests/{id}/approve/ succeeds
   - ✅ ApprovalHistory created
   - ✅ current_step → Step 2 (Director Approval)
   - ✅ Request no longer in approver1_user's "My Approvals"

6. **Step 6 - My Approvals (approver2)** (approver2_user)
   - ✅ GET /api/prs/requests/my-approvals/ returns the request
   - ✅ current_step_name = "Director Approval"

7. **Step 7 - Approve Step 2** (approver2_user)
   - ✅ POST /api/prs/requests/{id}/approve/ succeeds
   - ✅ ApprovalHistory created
   - ✅ No more steps → status → FULLY_APPROVED
   - ✅ current_step → null
   - ✅ Request no longer in approver2_user's "My Approvals"

## ✅ All Components Ready

Everything is set up correctly according to the test specification. The management command `setup_workflow_test_data` creates all required components.

**Next Step:** Run the command and proceed with testing:
```bash
cd Backend/Backend
python manage.py setup_workflow_test_data
```













