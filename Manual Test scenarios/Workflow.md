Here’s a full, production-grade test spec for S04 – Multi-level approval workflow that fits perfectly with your existing S02/S03 style.

⸻

S04 – Multi-level approval workflow (Requester → Approver1 → Approver2)

Purpose
Validate that a purchase request can pass through a multi-stage approval chain with:
	•	Correct status transitions
	•	Correct current_step updates
	•	Correct visibility in “My Approvals”
	•	Correct permissions (only the right approver at each step)

⸻

1. Preconditions / Test Data

You can reuse most of S02/S03 setup, plus define a specific workflow for this scenario.

1.1 Users
	•	requester_user – standard Requester
	•	approver1_user – first-level approver (e.g., Team Lead / Manager)
	•	approver2_user – second-level approver (e.g., Department Head)
	•	non_approver_user – some other user with no approver role on this workflow (for negative checks)

All users are active and can authenticate.

1.2 Team & Template
	•	Team A (e.g., Marketing), TEAM_A_ID:
	•	Active team.
	•	requester_user is allowed to create requests for this team.
	•	Active FormTemplate for Team A with:
	•	BUDGET_AMOUNT (NUMBER, required)
	•	CAMPAIGN_NAME (TEXT, required)

1.3 Workflow (Multi-level Approval)

For Team A, define:
	•	Workflow W1 (Team A workflow)

Steps:
	1.	Step 1 – step_order = 1
	•	step_name = "Manager Approval"
	•	is_finance_review = False
	•	Approvers: approver1_user
	2.	Step 2 – step_order = 2
	•	step_name = "Director Approval"
	•	is_finance_review = False
	•	Approvers: approver2_user

(No finance step here; finance will be covered in a separate scenario, e.g., S05.)

1.4 Lookups
	•	REQUEST_STATUS includes at least:
	•	DRAFT
	•	PENDING_APPROVAL
	•	IN_REVIEW
	•	FULLY_APPROVED
	•	REJECTED
	•	PURCHASE_TYPE.SERVICE exists and active.

⸻

2. Main Scenario: Happy Path (Requester → Approver1 → Approver2)

S04-01 – Full multi-level approve sequence

Goal: Request moves from DRAFT → PENDING_APPROVAL → IN_REVIEW → FULLY_APPROVED with correct step ownership and visibility.

⸻

Step 1 – Requester creates a valid draft
	•	Actor: requester_user
	•	Action:
	1.	Authenticate as requester_user.
	2.	Call POST /api/prs/requests/ with:

{
  "team_id": "<TEAM_A_ID>",
  "vendor_name": "ACME Media Agency",
  "vendor_account": "IR-123-456-789",
  "subject": "Q2 Campaign",
  "description": "Multi-level approval test",
  "purchase_type": "SERVICE"
}


	•	Expected:
	•	HTTP 201 Created.
	•	Response status.code == "DRAFT".
	•	requestor id = requester_user.id.
	•	team.id == TEAM_A_ID.
	•	form_template_id = active Team A template id.
	•	current_step == null.
	•	Save ID as REQUEST_ID.

⸻

Step 2 – Requester fills required fields (if enforced before submit)
	•	Actor: requester_user
	•	Action:
	1.	PATCH /api/prs/requests/{REQUEST_ID}/ with:

{
  "field_values": [
    {
      "field_id": "<ID_OF_BUDGET_AMOUNT>",
      "value_number": "5000000"
    },
    {
      "field_id": "<ID_OF_CAMPAIGN_NAME>",
      "value_text": "Spring Campaign 1404"
    }
  ]
}


	•	Expected:
	•	200 OK.
	•	RequestFieldValue records created/updated correctly.
	•	No validation error.

⸻

Step 3 – Requester submits the request
	•	Actor: requester_user
	•	Action:
	1.	POST /api/prs/requests/{REQUEST_ID}/submit/ with empty body.
	•	Expected:
	•	200 OK.
	•	Backend:
	•	validates required fields (and attachments, if any).
	•	finds first workflow step (Manager Approval).
	•	Response shows:
	•	status.code == "PENDING_APPROVAL" (or IN_REVIEW if your implementation merges them — but be consistent with your PRD).
	•	current_step_id = Step 1 id (“Manager Approval”).
	•	current_step_name == "Manager Approval".
	•	submitted_at not null.
	•	AuditEvent created: REQUEST_SUBMITTED.

⸻

Step 4 – “My Approvals” for Approver1
	•	Actor: approver1_user
	•	Action:
	1.	Authenticate as approver1_user.
	2.	Call GET /api/prs/requests/my-approvals/.
	•	Expected:
	•	Response contains REQUEST_ID:
	•	status is an approval state (PENDING_APPROVAL / IN_REVIEW).
	•	current_step_name == "Manager Approval".
	•	The same request does not appear for approver2_user yet.

⸻

Step 5 – Approver1 approves (Manager Approval)
	•	Actor: approver1_user
	•	Action:
	1.	POST /api/prs/requests/{REQUEST_ID}/approve/ with {}.
	•	Expected:
	•	200 OK.
	•	Backend:
	•	ensure_user_is_step_approver passes for approver1_user.
	•	ApprovalHistory entry created with:
	•	action = APPROVE
	•	step = Manager Approval
	•	approver = approver1_user
	•	AuditEvent created for APPROVAL.
	•	Workflow moves to the next step:
	•	current_step_id = Step 2 id.
	•	current_step_name == "Director Approval".
	•	status.code:
	•	Often remains IN_REVIEW (still in approval chain).
	•	Request no longer appears in approver1_user’s “My Approvals”.

⸻

Step 6 – “My Approvals” for Approver2
	•	Actor: approver2_user
	•	Action:
	1.	Authenticate as approver2_user.
	2.	GET /api/prs/requests/my-approvals/.
	•	Expected:
	•	REQUEST_ID appears in the result.
	•	current_step_name == "Director Approval".
	•	No other random requests appear that approver2_user is not assigned to.

⸻

Step 7 – Approver2 approves (Director Approval – final non-finance step)
	•	Actor: approver2_user
	•	Action:
	1.	POST /api/prs/requests/{REQUEST_ID}/approve/.
	•	Expected:
	•	200 OK.
	•	ensure_user_is_step_approver passes.
	•	ApprovalHistory entry created:
	•	action = APPROVE
	•	step = Director Approval
	•	approver = approver2_user
	•	have_all_approvers_approved for this step = True.
	•	get_next_workflow_step returns None (no more steps).
	•	System sets final non-finance status:
	•	status.code == "FULLY_APPROVED" (per your PRD).
	•	current_step becomes null (no current step).
	•	AuditEvent created for last approval and state change.

⸻

Step 8 – Visibility after full approval
	•	Actor: requester_user
	•	Action:
	1.	GET /api/prs/requests/my/.
	•	Expected:
	•	REQUEST_ID is listed with:
	•	status.code == "FULLY_APPROVED".
	•	current_step == null.
	•	All audit/approval history visible via:
	•	GET /api/audit-events?request={REQUEST_ID} (or equivalent in your system).
	•	GET /api/approvals/history?request={REQUEST_ID} (if such endpoint exists).
	•	Actor: approver1_user and approver2_user
	•	Action:
	1.	GET /api/prs/requests/my-approvals/ for each.
	•	Expected:
	•	REQUEST_ID does not appear anymore in their approval inboxes.

⸻

3. Negative & Edge Sub-Scenarios for S04

You can list these under S04 but test them individually.

S04-02 – Non-approver cannot approve
	•	Actor: non_approver_user
	•	Precondition: Request in Step 1 (Manager Approval).
	•	Action:
	1.	POST /api/prs/requests/{REQUEST_ID}/approve/ as non_approver_user.
	•	Expected:
	•	403 Forbidden (or 400 with clear message).
	•	No ApprovalHistory entry created.
	•	Status and current_step unchanged.

⸻

S04-03 – Approver cannot approve again after already approved
	•	Actor: approver1_user
	•	Precondition:
	•	Approver1 has already approved, request is in Step 2.
	•	Action:
	1.	POST /api/prs/requests/{REQUEST_ID}/approve/ again as approver1_user.
	•	Expected:
	•	Either:
	•	403 / 400 because the request’s current_step no longer belongs to this approver.
	•	No duplicate ApprovalHistory entry created.
	•	Status and current_step unchanged.

⸻

S04-04 – Approver cannot approve when request is not in approval status
	•	Actor: approver1_user
	•	Precondition:
	•	Request status is DRAFT/REJECTED/COMPLETED (i.e., no current_step).
	•	Action:
	1.	POST /api/prs/requests/{REQUEST_ID}/approve/.
	•	Expected:
	•	400 Bad Request with message like “Request is not in an approvable state.”

⸻

4. Expected Outcomes Summary
	•	A request travels through two sequential approval steps exactly as defined in the workflow.
	•	Status transitions occur correctly:
	•	DRAFT → PENDING_APPROVAL/IN_REVIEW (on submit)
	•	PENDING_APPROVAL/IN_REVIEW → still IN_REVIEW at intermediate step
	•	Final approval by Approver2 → FULLY_APPROVED
	•	current_step reflects the current workflow position:
	•	Step 1 for Approver1, Step 2 for Approver2, null when fully approved.
	•	“My Approvals” endpoints show:
	•	A request only for the currently responsible approver.
	•	The request disappears from an approver’s inbox after they approve.
	•	Unauthorized or out-of-state actions (non-approver, double-approval, wrong state) are rejected with clear, consistent responses.

⸻

If you like, next we can do:
	•	S05 – Approval → Finance Review → Completion (Requester → Approver(s) → Finance),
	•	Or I can turn S02–S04 into a single Markdown document you can commit as docs/prs_purchase_requests_tests.md.