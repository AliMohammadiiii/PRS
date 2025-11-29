

S05 – Admin user visibility & control over purchase requests

Purpose
Ensure an Admin user has full visibility over all purchase requests, can access details for any team, but is still constrained by business rules:
	•	No deletion of purchase requests via API
	•	No approval/rejection unless also configured as a step approver
	•	No bypass of normal workflow logic

Note: This scenario assumes your product policy is:
	•	Admin = configuration + global read access
	•	Approvals are still governed by workflow/step approvers
If your policy allows Admin to override workflow, we can extend with override cases.

⸻

1. Preconditions / Test Data
	1.	Users
	•	admin_user – has Admin role (superuser/staff or dedicated role).
	•	requester_user_A – Requester in Team A.
	•	requester_user_B – Requester in Team B.
	•	approver_user – Approver for some steps.
	2.	Teams & Requests
	•	Team A and Team B, both active.
	•	At least three existing requests:
	•	REQ_A_DRAFT – DRAFT request created by requester_user_A in Team A.
	•	REQ_A_PENDING – PENDING_APPROVAL or IN_REVIEW for Team A.
	•	REQ_B_COMPLETED – COMPLETED request created by requester_user_B in Team B.
	3.	Workflow & Lookups
	•	Valid workflow(s) and statuses already configured as in previous scenarios.
	•	Admin is not configured as approver in any workflow step for these test requests unless explicitly mentioned in a sub-scenario.
	4.	Authentication
	•	admin_user can authenticate and obtain a valid token.

⸻

2. Sub-scenarios

S05-01 – Admin can list all purchase requests across teams

Scenario: Admin should see all requests, independent of team or requestor.
	•	Steps
	1.	Authenticate as admin_user.
	2.	Call GET /api/prs/requests/.
	•	Expected
	•	HTTP 200 OK.
	•	Response includes:
	•	REQ_A_DRAFT
	•	REQ_A_PENDING
	•	REQ_B_COMPLETED
	•	Admin can apply filters (team, status, date) and get correct subsets.
	•	Paginated response structure is valid.

⸻

S05-02 – Admin can view details for any request

Scenario: Admin has read access to every request.
	•	Steps
	1.	As admin_user, call:
	•	GET /api/prs/requests/{REQ_A_DRAFT_ID}/
	•	GET /api/prs/requests/{REQ_B_COMPLETED_ID}/
	2.	Inspect the response.
	•	Expected
	•	HTTP 200 OK for both.
	•	Response includes:
	•	Requestor info (user id / username).
	•	Team info.
	•	Status, current_step, submitted_at/completed_at, etc.
	•	field_values with nested field definitions.
	•	attachments_count correct.
	•	No permission error for cross-team access.

⸻

S05-03 – Admin cannot delete a purchase request via API

Scenario: Business rule – requests must not be hard-deleted; only status/archival allowed.
	•	Steps
	1.	As admin_user, call:
	•	DELETE /api/prs/requests/{REQ_A_DRAFT_ID}/
	2.	Observe the response.
	•	Expected
	•	HTTP 400 Bad Request (or whatever you implemented in destroy, per your summary: "Purchase requests cannot be deleted. Use status changes instead.").
	•	Response body includes a clear message:

{
  "detail": "Purchase requests cannot be deleted. Use status changes instead."
}

or similar.

	•	In the database:
	•	REQ_A_DRAFT still exists and is_active=True.

⸻

S05-04 – Admin cannot approve unless configured as a step approver

Scenario: Even Admin cannot bypass workflow-level permissions.
	•	Precondition
	•	REQ_A_PENDING has current_step where only approver_user is a WorkflowStepApprover.
	•	admin_user is not in that step’s approver list.
	•	Steps
	1.	As admin_user, call:
	•	POST /api/prs/requests/{REQ_A_PENDING_ID}/approve/ with {}.
	•	Expected
	•	HTTP 403 Forbidden (or a clear permission error).
	•	No new ApprovalHistory entry is created.
	•	status and current_step remain unchanged.
	•	Confirms ensure_user_is_step_approver applies also to Admin.

(If product policy says “Admin can approve anything”, then change this expected result to 200 and explicitly document override behavior. But as per your earlier structure, approvals are tied to workflow roles, not admin-ness.)

⸻

S05-05 – Admin cannot reject unless configured as step approver

Scenario: Same rule for rejection.
	•	Precondition
	•	Same as S05-04 (REQ_A_PENDING assigned to approver_user).
	•	Steps
	1.	As admin_user, call:
	•	POST /api/prs/requests/{REQ_A_PENDING_ID}/reject/ with:

{
  "comment": "Admin trying to reject without being an approver"
}


	•	Expected
	•	HTTP 403 Forbidden.
	•	No ApprovalHistory entry with action=REJECT.
	•	No state change to REJECTED.
	•	Confirms admin cannot arbitrarily reject.

⸻

S05-06 – Admin cannot complete finance review unless configured as finance approver

Scenario: Completion is a finance responsibility, not a generic admin power.
	•	Precondition
	•	A request REQ_FINANCE is in FINANCE_REVIEW and its current_step is finance step, with some finance user(s) as approvers.
	•	admin_user is not one of the step approvers.
	•	Steps
	1.	As admin_user, call:
	•	POST /api/prs/requests/{REQ_FINANCE_ID}/complete/ with {}.
	•	Expected
	•	HTTP 403 Forbidden.
	•	No status change (FINANCE_REVIEW stays).
	•	No completed_at set.
	•	No ApprovalHistory entry with action=COMPLETE.

⸻

S05-07 – Admin can see full audit & approval history for any request

Scenario: Admin has global audit visibility.
	•	Preconditions
	•	REQ_B_COMPLETED has multiple audit and approval history records.
	•	Steps
	1.	As admin_user, call whichever endpoints you have:
	•	GET /api/audit-events?request={REQ_B_COMPLETED_ID}
	•	GET /api/approvals/history?request={REQ_B_COMPLETED_ID} (if existing)
	2.	Inspect response.
	•	Expected
	•	HTTP 200 OK.
	•	Returns:
	•	All AuditEvent entries for this request (created, submitted, approvals, rejections, completion, attachments).
	•	All ApprovalHistory entries (each step, actions APPROVE / REJECT / COMPLETE).
	•	No permission error across teams or requestors.

⸻

S05-08 – Admin can filter requests for investigation

Scenario: Admin uses listing endpoint to filter by team, status, date.
	•	Steps
	1.	As admin_user, call:
	•	GET /api/prs/requests/?team=<TEAM_A_ID>&status=REJECTED
	•	GET /api/prs/requests/?status=COMPLETED&created_from=<date>&created_to=<date>
	2.	Validate filtering behavior.
	•	Expected
	•	Only matching requests are returned.
	•	Admin sees requests across all users, not limited to their own requests.

⸻

S05-09 – Admin can optionally create requests for any team (if allowed by policy)

Optional Scenario (depends on your product decision):
	•	If product policy: “Admin can also act as requester for any team”, then:
	•	Re-run S02 – Create new purchase request (happy path) using admin_user as actor for different teams (A, B).
	•	Expected:
	•	Creation works the same as for normal requester.
	•	requestor = admin_user.
	•	This is a good way to let Admin simulate/seed test data.

If product policy is “Admin should not create business requests”, then:
	•	Expected:
	•	POST /api/prs/requests/ as admin_user returns 403 or 400 with clear message.
	•	Document this rule explicitly in the PRD/test plan.

⸻

3. Expected Outcomes Summary for Admin User
	•	Admin can:
	•	List all requests across teams.
	•	View details of any request.
	•	View audit and approval history for any request.
	•	Use filters to investigate issues.
	•	Admin cannot:
	•	Delete purchase requests via API.
	•	Approve/reject/complete requests unless explicitly added as step/finance approver in that workflow.
	•	Bypass workflow rules simply by being Admin (unless explicitly designed to do so).

This keeps a clean separation between:
	•	Governance & observability (Admin)
	•	Business decision-making (Approvers & Finance)
