S02 – Create new purchase request (happy path)

Purpose
Ensure a Requester assigned to a team can create a new purchase request with valid data, using that team’s specific form and fields, and then see the created request in their own list.

⸻

Preconditions / Test Data
	1.	Users
	•	requester_user exists and is active.
	•	requester_user is explicitly assigned to Team A (e.g., “Marketing”) via whatever mechanism you use (e.g., AccessScope, UserTeam relation, or direct FK).
	•	(Optional negative coverage later: requester_user is not assigned to Team B.)
	2.	Teams
	•	Team A (e.g., id = TEAM_A_ID) is active.
	•	Team B (different team, e.g., “Tech”) is also active, and will be used to confirm that forms are team-specific.
	3.	Form Templates & Fields
	•	Team A has an active FormTemplate (e.g., Marketing Template v1) with at least:
	•	Field F1:
	•	field_id = "BUDGET_AMOUNT"
	•	field_type = NUMBER
	•	required = True
	•	Field F2:
	•	field_id = "CAMPAIGN_NAME"
	•	field_type = TEXT
	•	required = True
	•	Team B has a different active FormTemplate (e.g., Tech Template v1) with different fields, for example:
	•	Field G1: field_id = "SERVER_TYPE" (DROPDOWN, required)
	•	Field G2: field_id = "EXPECTED_LOAD" (NUMBER, optional)
	•	There must be exactly one active template per team.
	4.	Lookups
	•	REQUEST_STATUS lookup exists with code DRAFT.
	•	PURCHASE_TYPE lookup exists with code SERVICE (or whatever you use in UI).
	5.	Auth
	•	requester_user can successfully authenticate (UI or API).

⸻

Steps
	1.	Login as Requester
	•	Log in as requester_user (UI: via login page; API: obtain JWT token).
	•	Confirm login is successful.
	2.	Open “New Purchase Request” for Team A
	•	In UI: navigate to “New Purchase Request” screen.
	•	Select Team A (Marketing) from the team selector.
	•	The frontend calls:
	•	GET /api/prs/teams/ → returns Team A in the list for this user.
	•	GET /api/prs/teams/{TEAM_A_ID}/form-template/ → returns Team A’s Marketing Template v1 and its fields.
	3.	Verify Team-Specific Form Loaded
	•	Confirm that the form fields shown in the UI match Team A’s template:
	•	BUDGET_AMOUNT (Number, required)
	•	CAMPAIGN_NAME (Text, required)
	•	Confirm that fields from Team B’s template do NOT appear (e.g., no SERVER_TYPE, no EXPECTED_LOAD).
	4.	Fill in Base Request Data
	•	In the “header”/top section of the form, fill:
	•	Vendor Name: "ACME Media Agency"
	•	Vendor Account: "IR-123-456-789-0" (or any valid format)
	•	Subject: "Q2 Social Campaign"
	•	Description: "Paid media for Q2 launch"
	•	Purchase Type: "SERVICE"
	5.	Fill in Team A’s Required Dynamic Fields
	•	For BUDGET_AMOUNT (NUMBER, required): enter 5000000 (for example).
	•	For CAMPAIGN_NAME (TEXT, required): enter "Spring 1404 Social Campaign".
	6.	(Optional in S02) Attachments
	•	If Team A has required attachment categories (e.g., Invoice required on submission), you may skip file upload here if S02 is focused only on creation as DRAFT and not submission.
	•	We will cover required attachments in a separate “Submit” scenario. For S02, the important thing is that creation as DRAFT does not force attachments.
	7.	Submit the form to create the request (Create as DRAFT)
	•	In UI: click “ذخیره پیش‌نویس / Save Draft” or equivalent button.
	•	Frontend sends:
	•	POST /api/prs/requests/ with payload:

{
  "team_id": "<TEAM_A_ID>",
  "vendor_name": "ACME Media Agency",
  "vendor_account": "IR-123-456-789-0",
  "subject": "Q2 Social Campaign",
  "description": "Paid media for Q2 launch",
  "purchase_type": "SERVICE"
}


	•	Backend:
	•	Creates PurchaseRequest with:
	•	requestor = requester_user
	•	team = Team A
	•	form_template = Team A active template
	•	status = DRAFT
	•	Returns full serialized request.

	8.	Verify API Response for Creation
	•	HTTP status code is 201 Created.
	•	Response body:
	•	team.id == TEAM_A_ID
	•	status.code == "DRAFT"
	•	requestor matches requester_user
	•	form_template_id equals the active Marketing template’s id.
	•	No current_step yet (still null until submission).
	9.	Verify Request Appears in “My Requests”
	•	In UI: navigate to “درخواست‌های من / My Requests”.
	•	Frontend calls:
	•	GET /api/prs/requests/my/ (or GET /api/prs/requests/ with filter by requestor).
	•	Validate:
	•	The newly created request appears in the list.
	•	Its status is “Draft”.
	•	Team displayed is “Marketing” (Team A).
	•	Subject and vendor are correctly shown.
	10.	Verify Team Isolation (Optional but Recommended in S02)
	•	Still as requester_user:
	•	Start a new request and this time change team selection to Team B.
	•	Expected:
	•	Form fields now match Tech Template v1, not Marketing Template v1.
	•	This proves “Each team has their own special form and fields” from the UI perspective.
	•	If your business rule says the user is not assigned to Team B, then:
	•	Team B should not appear in the team dropdown for this user.
	•	Any direct API attempt to use team_id=TEAM_B_ID should result in 403 or 400 (depending on your access model).

⸻

Expected Results
	1.	User–Team Assignment
	•	requester_user is only able to create a request for teams they are assigned to.
	•	If your model enforces this, creation with an unassigned team should fail (separate negative test).
	2.	Team-Specific Form
	•	When Team A is selected:
	•	Only Team A’s fields (e.g., BUDGET_AMOUNT, CAMPAIGN_NAME) are loaded and displayed.
	•	Fields from Team B’s template are never shown when Team A is selected.
	3.	Creation Success
	•	A new PurchaseRequest is created with:
	•	requestor = requester_user
	•	team = Team A
	•	status = DRAFT
	•	form_template = Team A’s active template
	•	API returns 201 Created and correct payload.
	4.	Visibility in My Requests
	•	The new draft request is visible in requester_user’s “My Requests” list.
	•	The record shows accurate basic info (team name, subject, vendor, status).
	5.	No Cross-Team Leak
	•	Selecting Team A never shows Team B’s fields.
	•	Optionally (depending on your rules), requester_user cannot start a request for an unassigned team.
