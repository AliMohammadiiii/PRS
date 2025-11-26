

S06 – Admin: Team management

Purpose: Ensure Admin can create, update, activate/deactivate teams correctly and that they appear correctly in PRS flows.

⸻

S06-01 – Create a new team (happy path)

Goal: Admin can create a new team that later can be used in PRS.
	•	Preconditions
	•	admin_user exists and has access to team management UI/API.
	•	Steps
	1.	Login as admin_user.
	2.	Open “Team Management” (UI) or call POST /api/teams/ (if exposed).
	3.	Provide:
	•	name = "Data Science"
	•	description = "Data Science & Analytics team"
	•	is_active = True
	4.	Save.
	•	Expected
	•	HTTP 201 Created or success in UI.
	•	Team appears with:
	•	Non-null id.
	•	name == "Data Science".
	•	is_active == True.
	•	New team is returned by:
	•	GET /api/prs/teams/ (for PRS front-end).
	•	Not yet usable for PRS requests until FormTemplate + Workflow are configured (covered later).

⸻

S06-02 – Update team details

Goal: Admin can edit team name/description safely.
	•	Steps
	1.	As admin_user, edit existing team “Marketing”:
	•	Change name to "Growth Marketing".
	•	Update description.
	2.	Save.
	•	Expected
	•	Changes are persisted.
	•	GET /api/prs/teams/ returns updated name/description.
	•	No side-effects on existing PurchaseRequests (they still link to same team id).

⸻

S06-03 – Deactivate team (is_active=False)

Goal: Deactivated teams should not be available for new requests.
	•	Steps
	1.	As admin_user, set is_active=False on team “Tech”.
	2.	Call GET /api/prs/teams/.
	3.	Try to create a new request with team_id of “Tech”.
	•	Expected
	•	“Tech” no longer appears in /prs/teams/ list.
	•	POST /prs/requests/ with that team_id returns:
	•	400 "Team not found or is not active." (as per serializer).
	•	Existing requests for that team are still accessible (read-only), unless you explicitly block them (your choice).

⸻

S07 – Admin: User assignment to teams

Purpose: Ensure Admin can create/assign users to teams so PRS knows which teams each user can work with.

(Exact implementation depends on your AccessScope or similar model. I’ll phrase in abstract but you can map.)

⸻

S07-01 – Assign existing user to a team

Goal: Requester can later create requests only for assigned teams (if you enforce that).
	•	Preconditions
	•	requester_user exists.
	•	Team “Marketing” exists and active.
	•	Steps
	1.	As admin_user, go to “User Access / AccessScope”.
	2.	Create an access record for requester_user:
	•	user = requester_user
	•	team = Marketing
	•	role = "REQUESTER" (or similar).
	3.	Save.
	•	Expected
	•	AccessScope persists correctly.
	•	requester_user sees “Marketing” in PRS team dropdown.
	•	If you call GET /api/prs/teams/ with appropriate filters, it only returns teams this user can access (when you enable that filter).

⸻

S07-02 – Unassign user from team

Goal: User loses ability to create new requests for that team.
	•	Steps
	1.	As admin_user, remove or deactivate AccessScope linking requester_user to Marketing.
	2.	As requester_user, open “New Purchase Request”.
	3.	Check team dropdown and try POST /prs/requests/ for that team.
	•	Expected
	•	“Marketing” no longer visible in team selector (if enforced in front-end).
	•	Backend:
	•	POST /prs/requests/ with team_id=Marketing returns 403/400 (“not allowed to create requests for this team”), if you enforce team-based permissions there.
	•	Existing requests by that user for that team remain accessible via My Requests, unless explicitly revoked.

⸻

S07-03 – Admin creates a new user and assigns to team

Goal: Onboarding flow: Admin creates user + team assignment.
	•	Steps
	1.	As admin_user, create new_requester_user via admin UI/API (username, email, password, role Requester).
	2.	Assign new_requester_user to team “Product” using access scope.
	3.	Login as new_requester_user.
	4.	Open “New Purchase Request”.
	•	Expected
	•	New user can authenticate.
	•	Team “Product” appears as selectable.
	•	POST /prs/requests/ with that team succeeds (subject to templates/workflow being configured).

⸻

S08 – Admin: FormTemplate & FormField management (per team)

Purpose: Ensure Admin can define and change team-specific forms, with constraints like “only one active template per team”.

⸻

S08-01 – Create initial form template for a team

Goal: Team becomes usable for PRS because it has an active template.
	•	Preconditions
	•	Team “Marketing” exists, no active FormTemplate yet.
	•	Steps
	1.	As admin_user, in prs_forms admin or via API:
	•	Create FormTemplate:
	•	team = Marketing
	•	version_number = 1
	•	is_active = True
	•	created_by = admin_user
	2.	Add fields:
	•	F1: field_id="BUDGET_AMOUNT", field_type=NUMBER, required=True, order=1.
	•	F2: field_id="CAMPAIGN_NAME", field_type=TEXT, required=True, order=2.
	3.	Save.
	•	Expected
	•	Template saved successfully.
	•	GET /api/prs/teams/{Marketing_ID}/form-template/ returns this template and both fields ordered by order.
	•	Request creation for Marketing now works (no “no active form template” errors like in S03-04).

⸻

S08-02 – Enforce “only one active template per team”

Goal: System prevents multiple active templates for same team.
	•	Steps
	1.	Ensure Marketing already has active template v1.
	2.	As admin_user, create another FormTemplate:
	•	team = Marketing
	•	version_number = 2
	•	is_active = True.
	3.	Save.
	•	Expected
	•	clean()/save() of FormTemplate should raise ValidationError like:
	•	“Only one active form template is allowed per team.”
	•	No second active template committed to DB.
	•	If admin tries to activate v2, they must first deactivate v1 or your UI enforces a toggle.

⸻

S08-03 – Update fields for an existing template

Goal: Admin can modify labels, required flags, and order.
	•	Steps
	1.	As admin_user, edit Marketing Template v1:
	•	Change CAMPAIGN_NAME.label to "نام کمپین تبلیغاتی".
	•	Set BUDGET_AMOUNT.required=True if not already.
	•	Change orders (e.g., CAMPAIGN_NAME order 1, BUDGET_AMOUNT order 2).
	2.	Save and then GET /prs/teams/{Marketing}/form-template/.
	•	Expected
	•	Updated labels and required flags appear in API.
	•	fields array returned in new order.
	•	UI shows new labels and order in “New Purchase Request” for Marketing.

⸻

S08-04 – Deactivate template and create a new version

Goal: Versioning – switch from v1 to v2.
	•	Steps
	1.	As admin_user, set Template v1 is_active=False.
	2.	Create Template v2 with new/updated fields.
	3.	Set is_active=True on v2.
	4.	Call GET /prs/teams/{Marketing}/form-template/.
	•	Expected
	•	Only v2 is active.
	•	API returns v2 and its fields.
	•	Creation of new requests uses v2 (existing requests remain bound to v1, if you store the FK at request creation).

⸻

S09 – Admin: Workflow configuration (per team)

Purpose: Ensure Admin can create and update approval workflows per team, including multi-step and finance steps, with rules like “exactly one finance review step”.

⸻

S09-01 – Create basic workflow for a team

Goal: Team becomes approvable because it has a workflow.
	•	Preconditions
	•	Team “Marketing” exists.
	•	approver_user1, approver_user2, finance_user exist.
	•	Steps
	1.	As admin_user, create Workflow:
	•	team = Marketing
	•	name = "Default Marketing Workflow".
	2.	Create WorkflowSteps:
	•	Step 1:
	•	step_order = 1
	•	step_name = "Manager Approval"
	•	is_finance_review = False
	•	Approvers: approver_user1
	•	Step 2:
	•	step_order = 2
	•	step_name = "Director Approval"
	•	is_finance_review = False
	•	Approvers: approver_user2
	•	Step 3:
	•	step_order = 3
	•	step_name = "Finance Review"
	•	is_finance_review = True
	•	Approvers: finance_user
	3.	Save.
	•	Expected
	•	Workflow + steps + step-approvers persisted.
	•	validate on WorkflowStep enforces:
	•	Exactly one is_finance_review=True.
	•	On submit for a Marketing request:
	•	get_first_workflow_step(team) returns Step 1.
	•	Approvals follow Step1 → Step2 → Step3 (then complete).

⸻

S09-02 – Enforce exactly one finance step per workflow

Goal: System prevents 0 or >1 finance step.
	•	Case 1 – Try to add a second is_finance_review=True
	•	Steps:
	1.	For the same workflow, try to create Step 4 with is_finance_review=True.
	•	Expected:
	•	clean() or save() on WorkflowStep raises ValidationError (one finance step already exists).
	•	Case 2 – No finance step at all (optional, depending on PRD)
	•	Steps:
	1.	Create Workflow with all steps is_finance_review=False.
	•	Expected:
	•	Either:
	•	ValidationError when creating last step, or
	•	Submission later fails with explicit error (“No finance review step configured for this team”), depending on your business decision.

⸻

S09-03 – Update step order and name

Goal: Admin can reorder steps and rename them.
	•	Steps
	1.	As admin_user, change Marketing workflow:
	•	Swap step_order of Manager and Director approvals (Director first).
	2.	Save.
	3.	Submit a new Marketing request and follow approval flow.
	•	Expected
	•	Approval now goes:
	•	Director → Manager → Finance.
	•	get_first_workflow_step(team) respects new ordering.
	•	Existing requests may still be bound to previous step definitions (depending on your migration strategy) – test both new and existing request behavior.

⸻

S10 – Admin: End-to-end configuration impact

Purpose: Confirm that after Admin configuration (team, form, workflow, access) the PRS flow works from Requester → Approvals → Finance for that team.

This is effectively integration validation of S06–S09.

⸻

S10-01 – Admin fully configures a new team and Requester can use it
	•	Steps
	1.	As admin_user:
	•	Create new team "R&D".
	•	Assign requester_user to team "R&D".
	•	Create active FormTemplate v1 for "R&D" with a couple of fields.
	•	Create Workflow for "R&D" with:
	•	Step 1: Manager (approver_user1)
	•	Step 2: Finance (finance_user, is_finance_review=True).
	2.	As requester_user:
	•	Create, fill, and submit a request for "R&D".
	3.	As approver_user1:
	•	Approve.
	4.	As finance_user:
	•	Complete.
	•	Expected
	•	No configuration-related errors.
	•	Form fields and workflow steps follow Admin configuration.
	•	Status lifecycle is correct.
	•	All roles see their expected inboxes (My Requests, My Approvals, Finance Inbox).
