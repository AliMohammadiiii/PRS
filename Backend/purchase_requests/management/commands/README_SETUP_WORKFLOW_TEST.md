# Setup Workflow Test Data (S04)

This management command sets up all the test data required for **S04 - Multi-level approval workflow test** as specified in `Manual Test scenarios/Workflow.md`.

## What It Creates

### 1. Users
- **requester_user** - Standard Requester (password: `testpass123`)
  - Assigned to Team A (Marketing) via AccessScope
- **approver1_user** - First-level approver (password: `testpass123`)
  - Assigned as approver for Step 1 (Manager Approval)
- **approver2_user** - Second-level approver (password: `testpass123`)
  - Assigned as approver for Step 2 (Director Approval)
- **non_approver_user** - User with no approver role (password: `testpass123`)
  - For negative test scenarios

### 2. Team A (Marketing)
- Active team named "Marketing"
- Description: "Marketing team for workflow test"

### 3. Form Template for Team A
- Active form template with version number
- **Fields:**
  - `BUDGET_AMOUNT` (NUMBER, required, order: 1)
  - `CAMPAIGN_NAME` (TEXT, required, order: 2)

### 4. Workflow W1 for Team A
- Workflow name: "Team A Workflow"
- **Steps:**
  - Step 1: "Manager Approval" (step_order=1, approver1_user)
  - Step 2: "Director Approval" (step_order=2, approver2_user)
- **Note:** No finance step (as per test specification - finance will be covered in S05)

### 5. AccessScope
- `requester_user` → Team A (Marketing) with role "REQUESTER"

## Prerequisites

1. Django migrations must be run:
   ```bash
   python manage.py migrate
   ```

2. Required lookup types must exist:
   - `REQUEST_STATUS` with values: DRAFT, PENDING_APPROVAL, IN_REVIEW, REJECTED, FULLY_APPROVED
   - `PURCHASE_TYPE` with value: SERVICE
   
   These should be created by the migration `0004_add_prs_lookups.py`.

## Usage

### Basic Usage
```bash
cd Backend/Backend
python manage.py setup_workflow_test_data
```

### Reset Existing Data
If you want to delete existing test data and start fresh:
```bash
python manage.py setup_workflow_test_data --reset
```

## Expected Output

```
Setting up S04 workflow test data...
✓ Lookup types verified
  ✓ Created user: requester_user (Requester)
  ✓ Created user: approver1_user (Approver 1)
  ✓ Created user: approver2_user (Approver 2)
  ✓ Created user: non_approver_user (Non Approver)
  ✓ Created team: Marketing
  ✓ Created form template for Marketing
    ✓ Created field: BUDGET_AMOUNT (NUMBER, required)
    ✓ Created field: CAMPAIGN_NAME (TEXT, required)
  ✓ Created workflow: Team A Workflow
    ✓ Created step 1: Manager Approval
      ✓ Assigned approver1_user to Manager Approval
    ✓ Created step 2: Director Approval
      ✓ Assigned approver2_user to Director Approval
  ✓ Created AccessScope: requester_user -> Marketing (REQUESTER)

✅ Successfully set up S04 workflow test data!
```

## Test Data Summary

After running the command, you'll have:

- **4 test users** (all with password: `testpass123`)
- **1 team** (Marketing)
- **1 form template** with 2 required fields
- **1 workflow** with 2 approval steps (no finance step)
- **1 AccessScope** assignment

## Next Steps

After running this command, you can proceed with testing the workflow as described in `Manual Test scenarios/Workflow.md`:

1. Authenticate as `requester_user`
2. Create a purchase request for Team A
3. Fill in BUDGET_AMOUNT and CAMPAIGN_NAME
4. Submit the request
5. Test the approval flow through approver1_user and approver2_user

## Troubleshooting

### "Required lookup types not found"
- Run migrations: `python manage.py migrate`
- Check that `classifications/migrations/0004_add_prs_lookups.py` has been applied

### "User already exists" warnings
- This is normal if you run the command multiple times
- Users will be updated (password reset, is_active=True)
- Use `--reset` flag to delete and recreate everything

### Purchase Type dropdown not showing "Service" and "Good"
**Problem:** The dropdown for purchase type doesn't show options or shows empty.

**Solution:** Run the fix command:
```bash
python manage.py fix_purchase_type_lookups
```

This ensures that:
- PURCHASE_TYPE lookup type exists and is active
- SERVICE and GOOD lookups exist and are active
- They will appear in the frontend dropdown

**Why this happens:** The LookupViewSet filters by `is_active=True` by default. If the lookups were created but marked as inactive, they won't appear in the API response.

### Workflow validation errors
- The command creates a workflow without a finance step (as per test spec)
- If you get validation errors about missing finance step, this may be due to model constraints
- The test spec explicitly states "No finance step here; finance will be covered in a separate scenario, e.g., S05"

