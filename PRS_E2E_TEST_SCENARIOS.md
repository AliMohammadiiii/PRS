## PRS Application – Manual E2E Test Scenarios

This document defines **manual, UI-based end-to-end scenarios** for the deployed PRS application.  
Each scenario is written so it can be executed **manually in a browser** against your deployed environment.

For every scenario:
- **Purpose**: What the test validates.
- **Preconditions**: What must exist before running it.
- **Test Data**: Example inputs (adjust as needed).
- **Steps / Expected Result**: Exact actions and what should happen.

You can copy individual scenarios into your own test cases or use this file directly during testing.

---

## Main Scenarios

---

### S01 – User authentication & role-based access

**Purpose**: Verify login, logout, and role-based navigation for Requester, Approver, and Admin.

**Preconditions**

- Application is deployed and reachable (for example: `https://prs.yourcompany.com`).
- Users exist:
  - Requester: `requester@test.com` (role: Requester)
  - Approver: `approver@test.com` (role: Approver)
  - Admin: `admin@test.com` (role: Admin)
- Passwords for all three users are known.


- Valid credentials for Requester, Approver, and Admin.

**Steps / Expected Results**

1. **Open login page**
   - **Step**: Open a browser in Private/Incognito mode and go to `https://prs.yourcompany.com`.
   - **Expected**:
     - Login screen is displayed.
     - No internal pages (dashboard, lists, admin pages) are visible without authentication.

2. **Attempt to access a protected URL while not logged in**
   - **Step**: In the address bar, manually type a known internal URL (for example, `/dashboard` or `/requests`) and press Enter.
   - **Expected**:
     - You are redirected back to the login screen.
     - Optional: A message indicates you must log in (but no data from protected pages is leaked).

3. **Login as Requester**
   - **Step**: On the login page, enter the Requester username/email and password, then click **Login**.
   - **Expected**:
     - No error message is shown.
     - You are redirected to the Requester landing page or main dashboard.
     - The logged-in user’s name or avatar is visible somewhere (for example, top-right profile menu).

4. **Check Requester navigation**
   - **Step**: Inspect the sidebar or top navigation (right-hand Persian menu).
   - **Expected**:
     - Menus appropriate for a Requester are visible, such as:
       - `ثبت درخواست خرید` (register purchase request)
       - `درخواست‌های من` (my requests)
       - `تأییدهای من` (my approvals)
       - `صندوق مالی` (financial box)
       - `تغییر رمز عبور` (change password)
     - Menus intended for administrators (for example, **Users**, **Teams**, **Workflows**, **System Settings**) are **not** visible.

5. **Try to open an Admin page URL as Requester**
   - **Step**: In the address bar, manually enter an admin/config URL (for example, `/admin`, `/users`, `/workflows`) and press Enter.
   - **Expected**:
     - You see an “Access denied” / “Not authorized” page, or you are redirected to a safe page.
     - The Requester is **not** shown any admin UI.

6. **Logout as Requester**
   - **Step**: Use the profile menu (top-right) and select **Logout**.
   - **Expected**:
     - The session is terminated.
     - You are redirected to the login page.
     - Refreshing the page keeps you on the login screen.

7. **Login as Approver**
   - **Step**: On the login screen, enter Approver credentials and click **Login**.
   - **Expected**:
     - Approver’s landing page loads, often showing **Pending Approvals** or similar.

8. **Check Approver navigation**
   - **Step**: Inspect the sidebar or top navigation.
   - **Expected**:
     - Menus like **Pending Approvals**, **Approval History** are visible.
     - Global system settings menus (for example, **Users**, **Workflows**) are not shown unless the Approver also has admin privileges.

9. **Login as Admin**
   - **Step**: Logout as Approver, then log in again with Admin credentials.
   - **Expected**:
     - Admin dashboard loads.
     - Navigation includes configuration sections such as **Users**, **Teams**, **Workflows**, **Lookups**, and possibly **Reports**.

10. **Access Admin sections**
    - **Step**: Click into **Users**, **Teams**, and **Workflows** pages from the Admin navigation.
    - **Expected**:
      - Each page loads successfully (no 403/500 errors).
      - Admin can view lists of entities (users, teams, workflows), with actions like **Edit**, **Create**, or **Disable** (depending on your implementation).

---

### S02 – Create new purchase request (happy path)

**Purpose**: Ensure a Requester can create a new purchase request with valid data and see it in their list.

**Preconditions**

- Requester user exists and can log in (from S01).
- Reference data is present: Departments, Cost Centers, Categories, etc.
- At least one open financial period is configured if required by the system.

**Test Data (example – adjust to your business rules)**

- Title: `E2E Request – Laptop Purchase`
- Description: `Requesting laptop for software engineer`
- Amount: `2500`
- Currency: `USD`
- Department: `IT`
- Cost Center: `IT-001`
- Category: `Hardware`
- Needed By: Today + 7 days

**Steps / Expected Results**

1. **Login as Requester**
   - **Step**: Log in with Requester credentials.
   - **Expected**:
     - Requester dashboard loads without errors.

2. **Navigate to Request list**
   - **Step**: In the sidebar, click the menu `درخواست‌های من` (My Requests).
   - **Expected**:
     - A list page is displayed.
     - It shows existing requests or an empty state message if none exist.

3. **Open New Request form**
   - **Step**: From the sidebar, click the top item `ثبت درخواست خرید` to open the **New Purchase Request** form.
   - **Expected**:
     - The request creation form opens.
     - Mandatory fields are visible and ideally marked (for example, an asterisk `*`).

4. **Fill in required header fields**
   - **Step**: Enter the test data (Title, Description, Amount, Currency, Department, Cost Center, Category, Needed By).
   - **Expected**:
     - Form accepts the values.
     - No validation errors are displayed for valid inputs.

4.1 **Select Team – visibility limited to requester’s teams**
   - **Step**: In the **Team** dropdown (or equivalent field on the purchase request form), open the list of available teams.
   - **Expected**:
     - Only teams that the logged-in requester belongs to are visible in the dropdown.
     - Teams from other departments or users are **not** listed.

5. **Optionally add line items (if your model includes lines)**
   - **Step**: Click **Add Line** and fill in line fields (for example, Item Name, Quantity, Unit Price).
   - **Expected**:
     - Line total is calculated correctly (Quantity × Unit Price).
     - Header total amount updates to sum of line totals if auto-calculation is implemented.

6. **Save as Draft (if feature exists)**
   - **Step**: Click **Save Draft**.
   - **Expected**:
     - A success message (toast or banner) is displayed.
     - Status is set to `Draft`.
     - You remain on the detail page, or you are redirected to the list where a new `Draft` row appears.

7. **Submit the request for approval**
   - **Step**: From the Draft request, click **Submit** or **Submit for Approval**.
   - **Expected**:
     - A confirmation dialog may appear; confirm the action.
     - Status changes to `Submitted` (or your equivalent).
     - Form becomes read-only or partially read-only according to business rules.

8. **Verify request in the Request list**
   - **Step**: Return to the list view and search/filter by the Title `E2E Request – Laptop Purchase`.
   - **Expected**:
     - A row for this request is present.
     - Fields like requester name, department, amount, and status (for example, `Submitted`) are correct.

9. **Re-open and verify data persistence**
   - **Step**: Click the row to open the request details.
   - **Expected**:
     - All header fields match what you entered.
     - Line items are present and correct.
     - No values are missing or reset.

---

### S03 – Validation and error handling on request creation

**Purpose**: Ensure required fields and business rules are enforced with clear error messages.

**Preconditions**

- Same as S02, but this time we intentionally enter invalid or incomplete data.

**Test Data**

- Use invalid or empty values as indicated in the steps.

**Steps / Expected Results**

1. **Login and open New Request form**
   - **Step**: Log in as Requester; navigate to **My Requests**; click **New Request**.
   - **Expected**:
     - New Request form is displayed.

2. **Attempt to submit with all fields empty**
   - **Step**: Without filling any field, click **Submit** or **Save**.
   - **Expected**:
     - Form is not submitted.
     - Clear validation messages appear for all required fields (for example, `Title is required`, `Amount is required`).
     - No unstyled server error pages or generic browser errors appear.

3. **Enter invalid Amount (non-numeric or negative)**
   - **Step**: Type `-100` or `abc` into the Amount field and click **Submit**.
   - **Expected**:
     - Validation error appears indicating a positive numeric amount is required.
     - The Amount field is highlighted.

4. **Enter an excessively large Amount (limit testing, if rule exists)**
   - **Step**: Enter a very large amount (for example, `999999999`) and try to submit.
   - **Expected**:
     - If there is a business rule limit, a validation message indicates the maximum allowed amount.
     - No raw `500` or technical error is shown to the user.

5. **Leave required reference field empty (for example, Department)**
   - **Step**: Fill all mandatory fields except **Department**, then click **Submit**.
   - **Expected**:
     - Submission is blocked.
     - Department field shows a specific validation message (for example, `Department is required`).

6. **Correct the fields and successfully submit**
   - **Step**: Fix all invalid or missing values and click **Submit** again.
   - **Expected**:
     - Request is successfully created (status `Draft` or `Submitted` according to your flow).
     - All previous error messages are cleared.

---

### S04 – Multi-level approval workflow (Requester → Approver1 → Approver2)

**Purpose**: Validate a multi-stage approval chain with correct status transitions and visibility.

**Preconditions**

- Users:
  - Requester: `requester@test.com`
  - First Approver: `approver1@test.com`
  - Second Approver: `approver2@test.com`
- Approval workflow is configured so that for the Requester’s department:
  - Stage 1 approver is Approver1.
  - Stage 2 approver is Approver2.
- A Submitted request will be routed through Approver1 then Approver2.

**Test Data**

- Request Title: `E2E Multi-Level Approval`
- Department: A department configured with a two-level workflow.

**Steps / Expected Results**

1. **Requester submits a new request**
   - **Step**: Login as Requester; create a new request with title `E2E Multi-Level Approval` and submit for approval (follow S02).
   - **Expected**:
     - Status becomes `Submitted`.
     - Request is visible in Requester’s **My Requests** list.

2. **Approver1 sees the request in their queue**
   - **Step**: Logout; login as Approver1; navigate to **Pending Approvals**.
   - **Expected**:
     - The request `E2E Multi-Level Approval` is listed.
     - From Approver1’s view, status indicates it is awaiting their approval (for example, `Pending Level 1`).

3. **Approver1 reviews the request details**
   - **Step**: Click the request to open the detail view.
   - **Expected**:
     - Header and line item data are displayed.
     - Approval controls are visible (for example, **Approve**, **Reject**, **Send Back**).

4. **Approver1 approves the request**
   - **Step**: Click **Approve** and confirm any dialog.
   - **Expected**:
     - A success message is shown.
     - Status transitions to the next stage (for example, `Pending Level 2 Approval`).
     - The request disappears from Approver1’s pending list.

5. **Approver2 sees the request**
   - **Step**: Logout; login as Approver2; navigate to **Pending Approvals**.
   - **Expected**:
     - The same request appears in Approver2’s queue.
     - Status from Approver2’s perspective is appropriate (for example, `Pending Final Approval`).

6. **Approver2 approves and completes the workflow**
   - **Step**: Open the request and click **Approve**.
   - **Expected**:
     - Status changes to the final approved state (for example, `Approved`).
     - The request is removed from Approver2’s pending list.

7. **Requester sees final approved status**
   - **Step**: Logout; login as Requester; open **My Requests** and select the same request.
   - **Expected**:
     - Status shows `Approved`.
     - Approval history shows two approvals (Approver1 then Approver2) with timestamps and actions.

---

### S05 – Rejection and resubmission flow

**Purpose**: Verify that an approver can reject a request, the requester can adjust and resubmit, and statuses update correctly.

**Preconditions**

- Requester and Approver1 users exist.
- Approval workflow is configured with at least one approval stage.

**Test Data**

- Request Title: `E2E Rejection Flow`

**Steps / Expected Results**

1. **Requester submits a request**
   - **Step**: Login as Requester; create a new request titled `E2E Rejection Flow`; submit for approval.
   - **Expected**:
     - Status is `Submitted`.

2. **Approver1 reviews and rejects**
   - **Step**: Login as Approver1; go to **Pending Approvals**; open `E2E Rejection Flow`; choose **Reject**.
   - **Expected**:
     - A dialog asks for a rejection reason/comment.
     - After confirming, a success message appears.
     - Status becomes `Rejected`.
     - Request is removed from Approver1’s pending list.

3. **Requester sees rejection and reason**
   - **Step**: Login as Requester; open **My Requests** and select `E2E Rejection Flow`.
   - **Expected**:
     - Status clearly shows `Rejected`.
     - Rejection reason/comment is visible in a notes or history section.

4. **Requester edits and resubmits**
   - **Step**: Modify fields as needed (for example, change amount or description); click **Submit** again.
   - **Expected**:
     - Status transitions back to `Submitted` or a special `Resubmitted` state.
     - Previous rejection note remains in history.
     - New submission action is also recorded.

5. **Approver1 sees resubmitted request**
   - **Step**: Login as Approver1; navigate to **Pending Approvals**.
   - **Expected**:
     - The request reappears in the queue.
     - It may be marked as a resubmission (depending on implementation).
     - History clearly shows original rejection and updated changes.

6. **Approver1 approves the resubmitted request**
   - **Step**: Approve the request.
   - **Expected**:
     - Final status becomes `Approved`.
     - Full history shows the complete lifecycle: Submitted → Rejected → Resubmitted → Approved.

---

### S06 – Attachments lifecycle (upload, view, permissions)

**Purpose**: Validate attachment upload, viewing, and cross-role permissions.

**Preconditions**

- Requester and Approver users exist.
- At least one Draft or Submitted request allows attachments.
- Local files are available:
  - `sample-quote.pdf`
  - `sample-spec.docx`

**Steps / Expected Results**

1. **Requester uploads attachments to a Draft request**
   - **Step**: Login as Requester; open a Draft request details page; go to the **Attachments** section; click **Upload** / **Add Attachment**.
   - **Expected**:
     - File picker dialog opens.

2. **Upload PDF file**
   - **Step**: Select `sample-quote.pdf` and confirm upload.
   - **Expected**:
     - A progress indicator appears and completes successfully.
     - The file appears in the attachment list with name, size, and upload date.
     - No error messages are displayed.

3. **Upload DOCX file**
   - **Step**: Click **Upload** again; select `sample-spec.docx`; confirm upload.
   - **Expected**:
     - A second attachment entry appears in the list.
     - Total attachment count is now 2.

4. **Open/download attachments as Requester**
   - **Step**: Click on `sample-quote.pdf`.
   - **Expected**:
     - The browser downloads or opens the PDF.
     - The file is not corrupted and opens correctly.
   - **Step**: Click on `sample-spec.docx`.
   - **Expected**:
     - The DOCX is downloaded and opens successfully.

5. **Approver can see attachments**
   - **Step**: Submit the request; login as Approver; open the same request details.
   - **Expected**:
     - Attachments section lists both files with correct names.
     - Approver can click and download each file without error.

6. **Check Requester’s permissions after submission**
   - **Step**: Login back as Requester; open the Submitted request with attachments.
   - **Expected**:
     - If your business rule is “no edits after submit”: buttons like **Delete** or **Upload New Attachment** are disabled or hidden.
     - If post-submit editing is allowed: editing actions behave consistently and changes are recorded.

---

### S07 – Reporting & filters (core PRS report)

**Purpose**: Ensure that key reports load, filters work correctly, and exported data matches on-screen data.

**Preconditions**

- Several requests exist with different:
  - Dates (recent vs older),
  - Statuses (`Draft`, `Submitted`, `Approved`, `Rejected`),
  - Departments,
  - Requesters.
- The test user (for example, Admin or Finance role) has permission to view reports.

**Steps / Expected Results**

1. **Open purchase requests report**
   - **Step**: Login as Admin/Finance; navigate to **Reports** → **Purchase Requests** (or equivalent).
   - **Expected**:
     - Report view loads successfully, showing a table or chart.
     - A default date range (for example, last 30 days) is applied.

2. **Filter by date range**
   - **Step**: Set the date filter (for example, From = first day of last month, To = today) and apply.
   - **Expected**:
     - Only requests within the specified date range are displayed.
     - Summary totals (count, total amount) reflect only the filtered rows.

3. **Filter by status**
   - **Step**: Set the Status filter to `Approved` and apply.
   - **Expected**:
     - All visible rows show status `Approved`.
     - No rows with `Draft` or `Rejected` statuses appear.

4. **Filter by department**
   - **Step**: Set a Department filter (for example, `IT`) and apply.
   - **Expected**:
     - All visible rows now match the chosen department and status/date filters.
     - If there are no matching records, the UI shows a clear “No data” message.

5. **Clear filters**
   - **Step**: Click **Clear filters** or remove each filter.
   - **Expected**:
     - Report returns to its default view with the original row count and totals.

6. **Export filtered data (if feature exists)**
   - **Step**: Re-apply a small filter (for example, date + `Approved` + `IT`) and click **Export** (CSV/Excel/PDF).
   - **Expected**:
     - A file is downloaded.
     - Opening the file shows only the rows that matched the on-screen filters.
     - Column headers are meaningful and match the report fields.

---

## Additional Important Scenarios

These scenarios are also valuable and can be added to your main suite over time.

---

### S08 – Permissions & data isolation between requesters

**Purpose**: Ensure one requester cannot access another requester’s data.

**Preconditions**

- Requester A and Requester B accounts exist.
- Each requester has created several requests of their own.

**Steps / Expected Results**

1. **Requester A sees only their own requests**
   - **Step**: Login as Requester A; open **My Requests**.
   - **Expected**:
     - Only Requester A’s requests are listed.

2. **Requester A tries to access Requester B’s request by URL**
   - **Step**: Obtain the URL of a request belonging to Requester B (for example, from B’s browser or test data); paste it into A’s browser while logged in as A.
   - **Expected**:
     - Access is denied (for example, `Not authorized`) or redirected to a safe page.
     - No sensitive details from B’s request are shown.

3. **Requester B sees only their own requests**
   - **Step**: Login as Requester B; open **My Requests**.
   - **Expected**:
     - Only Requester B’s requests appear.

---

### S09 – Session timeout and re-login

**Purpose**: Verify behavior when a user session expires due to inactivity.

**Preconditions**

- Session timeout is configured (for example, 15–30 minutes).

**Steps / Expected Results**

1. **Login and stay idle**
   - **Step**: Login as Requester; open the main dashboard; then leave the browser idle for longer than the configured session timeout.
   - **Expected**:
     - After timeout, performing an action (refresh, navigation, saving a form) either:
       - Redirects you to the login page, or
       - Shows a clear message that the session has expired and prompts re-login.

2. **Re-login and resume work**
   - **Step**: Login again when prompted.
   - **Expected**:
     - You are redirected to a safe default page (dashboard or the previous page if implemented).
     - The application continues to function normally; there is no broken or half-logged-in state.

---

### S10 – Basic audit/logging visibility (if audit UI exists)

**Purpose**: Confirm that key user actions on requests are recorded and visible in the UI.

**Preconditions**

- An audit or history feature exists in the UI (for example, a **History** or **Audit** tab on a request).
- There are requests with multiple actions (created, edited, submitted, approved/rejected).

**Steps / Expected Results**

1. **Open audit/history for a request**
   - **Step**: Login as a user with permission (for example, Admin or Requester); open a request that has been created, modified, and approved/rejected; go to the **History** / **Audit** section.
   - **Expected**:
     - A timeline or list of actions is displayed.
     - Entries include action type (for example, `CREATED`, `SUBMITTED`, `APPROVED`, `REJECTED`), actor, and timestamp.

2. **Inspect details of an audit entry**
   - **Step**: Click or expand one audit entry (if possible).
   - **Expected**:
     - It shows additional details, such as which fields changed (before/after) or comments added (for example, rejection reasons).

---

## Suggested Execution & Reporting Template

When you run these scenarios, you can use this mini-template to record your results:

```text
Scenario ID: S02
Scenario Name: Create new purchase request (happy path)
Environment URL: https://...
Test Date / Tester: 2025-11-26 / Ali

Step 1 – Login as Requester
Expected: ...
Actual: ...
Pass/Fail: Pass

Step 2 – ...
...
```

You can paste your filled results back into our chat so we can investigate any failures together.


