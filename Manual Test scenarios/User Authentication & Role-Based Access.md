
User authentication & role-based access
Purpose: Verify login, logout, and role-based navigation for Requester, Approver, and Admin.

⸻

1. Feature: User Authentication & Role-Based Access

Purpose
Verify that Requester, Approver, and Admin users can authenticate correctly and see only the navigation items and actions permitted to their role. Ensure unauthorized users cannot access protected areas.

Preconditions
	•	At least three test users exist:
	•	requester_user with “Requester” role
	•	approver_user with “Approver” role
	•	admin_user with “Admin” role
	•	Application is running and reachable (e.g., /login for UI, /api/auth/token/ for API)
	•	Roles and permissions are configured according to the PRS permission matrix:
	•	Requester: create/edit/submit own requests, manage own attachments
	•	Approver: view/approve/reject assigned requests
	•	Admin: configure teams, workflows, and has full access

⸻

2. Test Scenarios

UA-01 – Successful login as Requester
	•	Steps
	1.	Navigate to the login page.
	2.	Enter valid credentials for requester_user.
	3.	Click “Login”.
	•	Expected Result
	•	Login succeeds.
	•	User is redirected to the default Requester landing page (e.g., “My Requests”).
	•	Requester navigation is visible:
	•	“ثبت درخواست خرید / New Purchase Request”
	•	“درخواست‌های من / My Requests”
	•	No admin or configuration menus are visible.

⸻

UA-02 – Successful login as Approver
	•	Steps
	1.	Navigate to login page.
	2.	Enter valid credentials for approver_user.
	3.	Click “Login”.
	•	Expected Result
	•	Login succeeds.
	•	User is redirected to “My Approvals” or equivalent inbox.
	•	Approver navigation is visible:
	•	“درخواست‌های من” (optional)
	•	“تأییدهای من / My Approvals”
	•	No admin configuration menus are visible.
	•	No “New Purchase Request” if approvers are not allowed to create requests (based on your policy).

⸻

UA-03 – Successful login as Admin
	•	Steps
	1.	Navigate to login page.
	2.	Enter valid credentials for admin_user.
	3.	Click “Login”.
	•	Expected Result
	•	Login succeeds.
	•	User is redirected to an admin dashboard or default page.
	•	Admin navigation includes:
	•	Team management
	•	Form templates
	•	Workflows
	•	Lookup/configuration
	•	Admin can also access Requester/Approver views if designed to do so.

⸻

UA-04 – Invalid login (wrong password)
	•	Steps
	1.	Navigate to login page.
	2.	Enter valid username with incorrect password.
	3.	Click “Login”.
	•	Expected Result
	•	Login fails.
	•	User remains on login page.
	•	Clear, non-technical error message shown (e.g., “Invalid username or password”).
	•	No session/token is created.

⸻

UA-05 – Access protected route without authentication
	•	Steps
	1.	Open a protected page directly (e.g., /prs/my-requests or /prs/inbox) in a new browser session without logging in.
	•	Expected Result
	•	User is redirected to login page (UI).
	•	API calls return 401 Unauthorized if called without token.

⸻

UA-06 – Logout behavior
	•	Steps
	1.	Log in as any role (Requester/Approver/Admin).
	2.	Click “Logout”.
	3.	Try to navigate back to a protected page using browser back button.
	•	Expected Result
	•	User is redirected to login on any protected page.
	•	JWT/session is invalidated; no authenticated API calls succeed.
	•	Top-right user menu (if any) is reset to logged-out state.

⸻

UA-07 – Role-based navigation: Requester cannot see admin/approval items
	•	Steps
	1.	Log in as requester_user.
	2.	Inspect navigation menu and header.
	3.	Attempt to manually visit an admin URL (e.g., /admin, /prs/config/workflows).
	•	Expected Result
	•	Requester sees only Requester-facing links (New Request, My Requests).
	•	Direct access to admin URLs returns 403 Forbidden (or redirect to “not authorized” page).

⸻

UA-08 – Role-based navigation: Approver cannot access configuration
	•	Steps
	1.	Log in as approver_user.
	2.	Inspect navigation menus.
	3.	Attempt to manually open configuration pages (teams, templates, workflows).
	•	Expected Result
	•	Approver only sees approval-related menus (“My Approvals”, maybe “My Requests”).
	•	Configuration/admin menus are hidden.
	•	Direct URL access to configuration endpoints returns 403 Forbidden.

⸻

UA-09 – Role-based navigation: Admin full access
	•	Steps
	1.	Log in as admin_user.
	2.	Open:
	•	My Requests
	•	My Approvals
	•	Finance Inbox (if admin role has it)
	•	Configuration (teams, forms, workflows)
	3.	Confirm navigation items.
	•	Expected Result
	•	Admin can access all relevant modules.
	•	No 403/401 errors on admin/config screens.
	•	If a “super admin” policy is used, Admin can see both functional and configuration menus.

⸻

UA-10 – API-level authorization (Requester vs Approver vs Admin)
	•	Steps
	1.	Obtain JWT for each role via /api/auth/token/.
	2.	As Requester:
	•	Call POST /api/prs/requests/ → should succeed.
	•	Call POST /api/prs/requests/{id}/approve/ for a request not owned → should return 403.
	3.	As Approver:
	•	Call GET /api/prs/requests/my-approvals/ → returns only step-approver items.
	•	Call POST /api/prs/requests/ → allowed or denied according to your policy (define expected).
	4.	As Admin:
	•	Call any of the above plus configuration endpoints → all allowed according to admin policy.
	•	Expected Result
	•	Backend enforces the same role-based rules as the UI.
	•	No elevation of privilege via direct API calls.
