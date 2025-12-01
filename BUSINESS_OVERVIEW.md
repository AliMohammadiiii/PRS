# Purchase Request System (PRS) - Business Overview

## Executive Summary

The Purchase Request System (PRS) is a comprehensive digital solution designed to standardize, automate, and streamline the internal procurement process for organizations. It replaces manual, fragmented procurement workflows with a unified, transparent, and auditable system that enables all teams to initiate purchase requests, move them through team-specific approval workflows, and deliver fully approved requests to Finance for payment processing.

### Business Problem

**Before PRS:**
- Manual, paper-based or email-based procurement processes
- Inconsistent approval workflows across different teams
- Lack of transparency in request status and approval progress
- Difficulty tracking purchase requests and their history
- Risk of lost or misplaced documentation
- No centralized audit trail
- Delayed payment processing due to incomplete information
- Difficulty in enforcing procurement policies and controls

**After PRS:**
- Standardized, digital procurement process
- Team-specific workflows with clear approval chains
- Real-time visibility into request status and progress
- Complete audit trail of all actions and decisions
- Secure, centralized document storage
- Automated workflow progression
- Faster payment processing with complete information
- Policy enforcement through system configuration

## Business Objectives

### Primary Objectives

1. **Standardization**: Create a uniform procurement process across all organizational teams while allowing team-specific customization
2. **Transparency**: Provide complete visibility into request status, approval progress, and decision history
3. **Accountability**: Maintain a complete, immutable audit trail of all actions and decisions
4. **Efficiency**: Reduce time from request creation to payment processing
5. **Compliance**: Ensure all requests follow proper approval workflows and include required documentation
6. **Control**: Enforce procurement policies and approval hierarchies through system configuration

### Success Metrics

- **Process Efficiency**: Reduction in average time from request creation to payment processing
- **Compliance Rate**: Percentage of requests following proper approval workflows
- **User Adoption**: Number of active users and requests created per month
- **Error Reduction**: Decrease in rejected requests due to missing information
- **Audit Readiness**: Ability to provide complete audit trail for any request within minutes

## Business Process Overview

### High-Level Process Flow

```
1. Request Creation
   ↓
2. Request Submission
   ↓
3. Approval Workflow (Multiple Steps)
   ↓
4. Finance Review
   ↓
5. Payment Processing
```

### Detailed Business Process

#### 1. Request Initiation Phase

**Business Actors**: Team Members (Initiators)

**Process Steps**:
1. User identifies need for purchase (goods or services)
2. User selects their team and purchase type
3. System loads team-specific form template
4. User completes required information:
   - Vendor/Recipient details
   - Purchase description and purpose
   - Team-specific custom fields
   - Required attachments (invoices, quotes, contracts, etc.)
5. User saves as draft (can edit later)
6. User submits request for approval

**Business Rules**:
- Users can only create requests for teams they belong to
- All required fields must be completed before submission
- All required attachments must be uploaded before submission
- Draft requests can be edited until submitted

**Business Value**:
- Ensures complete information before approval process begins
- Reduces back-and-forth for missing information
- Allows users to prepare requests at their own pace

#### 2. Approval Workflow Phase

**Business Actors**: Managers, Directors, Department Heads (Approvers)

**Process Steps**:
1. Request moves to first approval step
2. Assigned approvers receive notification (via inbox)
3. Approver reviews:
   - Request details and vendor information
   - Attached documents
   - Approval history
   - Audit trail
4. Approver makes decision:
   - **Approve**: Request moves to next step
   - **Reject**: Request returns to initiator with comments
5. Process repeats for each workflow step
6. After all steps approved, request moves to Finance Review

**Business Rules**:
- Sequential approval (steps must be completed in order)
- All approvers at a step must approve (AND logic)
- Approvers cannot approve their own requests
- Rejection requires mandatory comment (minimum 10 characters)
- Rejected requests can be edited and resubmitted
- Workflow steps are team-specific and configurable

**Business Value**:
- Enforces proper approval hierarchy
- Ensures multiple stakeholders review high-value purchases
- Provides clear accountability for approval decisions
- Prevents unauthorized purchases

#### 3. Finance Review Phase

**Business Actors**: Finance Team (Finance Reviewers)

**Process Steps**:
1. Fully approved requests appear in Finance inbox
2. Finance reviewer performs final review:
   - Verifies all approvals are complete
   - Reviews all documentation
   - Confirms vendor payment details
   - Validates compliance with financial policies
3. Finance reviewer marks request as Complete
4. System sends completion email to organizational inbox
5. Finance processes payment

**Business Rules**:
- Only requests in "Fully Approved" status reach Finance
- Finance can reject requests back to initiator (with comments)
- Completion triggers organizational notification email
- Completed requests become read-only records

**Business Value**:
- Ensures financial compliance before payment
- Provides complete documentation for accounting
- Automates notification to payment processing team
- Maintains permanent record for audit purposes

#### 4. Request Completion Phase

**Business Actors**: Finance Team, Payment Processing Team

**Process Steps**:
1. Completion email received with all request details
2. Payment processing team prepares payment
3. Request record remains accessible for future reference
4. All data preserved for audit and reporting

**Business Value**:
- Complete information for payment processing
- Permanent audit trail
- Historical data for analysis and reporting

## Business Rules and Policies

### Request Creation Rules

1. **Team Membership**: Users can only create requests for teams they are assigned to
2. **Required Information**: All base fields (vendor, subject, description, etc.) are mandatory
3. **Team-Specific Fields**: Teams can define additional required fields
4. **Attachment Requirements**: Teams can define required attachment categories (e.g., "Invoice", "Contract")
5. **Purchase Type**: Must specify whether purchase is for "Goods" or "Service"

### Approval Rules

1. **Sequential Approval**: Steps must be completed in order; no skipping steps
2. **Multiple Approvers**: If multiple approvers assigned to a step, all must approve
3. **Self-Approval Prevention**: Users cannot approve their own requests
4. **Rejection Comments**: Rejections require explanation (minimum 10 characters)
5. **Workflow Immutability**: Workflows cannot be changed while requests are in progress

### Status Transition Rules

1. **Draft → Pending Approval**: On submission
2. **Pending Approval → In Review**: When first approver starts review
3. **In Review → Next Step**: When all approvers at current step approve
4. **Any Step → Rejected**: When any approver rejects
5. **Rejected → Resubmitted**: When initiator edits and resubmits
6. **Fully Approved → Finance Review**: When all workflow steps complete
7. **Finance Review → Completed**: When Finance marks complete
8. **Completed**: Terminal state (read-only)

### Editing Rules

1. **Editable States**: Only Draft, Rejected, and Resubmitted requests can be edited
2. **Approval Reset**: Editing a rejected request clears all previous approvals
3. **Resubmission**: Resubmitted requests restart workflow from Step 1
4. **Completed Requests**: Cannot be edited or modified

### Document Management Rules

1. **File Types**: Only PDF, JPG, JPEG, PNG, DOCX, XLSX, XLS allowed
2. **File Size**: Maximum 10 MB per file
3. **Versioning**: New attachments are added without removing old ones
4. **Access Control**: Only workflow participants can view/download attachments

## User Roles and Business Functions

### Initiator

**Business Function**: Create and submit purchase requests

**Responsibilities**:
- Identify purchase needs
- Gather required information and documentation
- Complete request forms accurately
- Upload required attachments
- Submit requests for approval
- Address rejection feedback and resubmit

**Business Value**: Ensures requests are complete and accurate before entering approval process

### Approver

**Business Function**: Review and approve/reject requests at assigned workflow steps

**Responsibilities**:
- Review request details and documentation
- Verify compliance with policies and budgets
- Make informed approval/rejection decisions
- Provide clear feedback when rejecting
- Ensure proper authorization before approving

**Business Value**: Enforces approval hierarchy and ensures proper authorization for purchases

### Finance Reviewer

**Business Function**: Final review and completion of approved requests

**Responsibilities**:
- Perform final compliance check
- Verify all approvals are complete
- Confirm vendor payment details
- Mark requests as complete for payment processing
- Reject requests that don't meet financial requirements

**Business Value**: Ensures financial compliance and provides complete information for payment processing

### Workflow Admin

**Business Function**: Configure workflows and forms for assigned teams

**Responsibilities**:
- Design team-specific approval workflows
- Configure form templates with required fields
- Assign approvers to workflow steps
- Define attachment requirements
- Manage team configurations

**Business Value**: Enables customization while maintaining standardization

### System Admin

**Business Function**: System-wide configuration and management

**Responsibilities**:
- Manage teams and users
- Configure system-wide settings
- Manage all workflows and forms
- Monitor system usage
- Handle escalated issues

**Business Value**: Ensures system operates effectively and supports organizational needs

## Business Use Cases

### Use Case 1: Marketing Team Purchases Advertising Services

**Scenario**: Marketing team needs to purchase advertising services from a vendor

**Process**:
1. Marketing team member creates request
2. Selects "Marketing" team and "Service" purchase type
3. Completes Marketing-specific form (may include budget fields, campaign details)
4. Uploads vendor quote and contract
5. Submits request
6. Marketing Manager approves (Step 1)
7. Marketing Director approves (Step 2)
8. Finance reviews and completes
9. Payment processed

**Business Value**: Ensures proper authorization for marketing spend and maintains documentation

### Use Case 2: Tech Team Purchases Software License

**Scenario**: Tech team needs to purchase annual software license

**Process**:
1. Tech team member creates request
2. Selects "Tech" team and "Service" purchase type
3. Completes Tech-specific form (may include license details, user count)
4. Uploads vendor quote and license agreement
5. Submits request
6. Tech Manager approves (Step 1)
7. CTO approves (Step 2)
8. Finance reviews and completes
9. Payment processed

**Business Value**: Ensures IT governance and proper authorization for software purchases

### Use Case 3: Product Team Purchases Office Equipment

**Scenario**: Product team needs to purchase office equipment

**Process**:
1. Product team member creates request
2. Selects "Product" team and "Goods" purchase type
3. Completes Product-specific form
4. Uploads vendor invoice and quote
5. Submits request
6. Product Manager approves (Step 1)
7. Finance reviews and completes
8. Payment processed

**Business Value**: Streamlines equipment procurement with proper authorization

### Use Case 4: Request Rejection and Resubmission

**Scenario**: Request is rejected and needs to be corrected

**Process**:
1. Approver rejects request with comment: "Budget exceeds limit, please revise"
2. Request returns to initiator with rejection comment
3. Initiator edits request (reduces amount or changes vendor)
4. Initiator resubmits request
5. Workflow restarts from Step 1
6. Request progresses through approval steps again

**Business Value**: Ensures issues are addressed before approval, maintaining quality and compliance

## Business Value and Benefits

### For the Organization

1. **Standardization**: Uniform procurement process across all teams
2. **Compliance**: Enforced approval workflows ensure policy compliance
3. **Audit Trail**: Complete, immutable record of all actions and decisions
4. **Efficiency**: Reduced time from request to payment
5. **Transparency**: Real-time visibility into request status and progress
6. **Control**: Centralized management of procurement policies
7. **Documentation**: Secure, centralized storage of all procurement documents
8. **Reporting**: Historical data for analysis and reporting

### For Finance Team

1. **Complete Information**: All requests arrive with complete documentation
2. **Faster Processing**: No need to request missing information
3. **Audit Readiness**: Complete audit trail readily available
4. **Automated Notifications**: Automatic email notifications for completed requests
5. **Policy Enforcement**: System ensures compliance before requests reach Finance

### For Approvers

1. **Clear Visibility**: See all requests pending their approval
2. **Complete Context**: Access to all request details, attachments, and history
3. **Efficient Review**: Centralized inbox for all approval tasks
4. **Accountability**: Clear record of approval decisions
5. **Mobile Access**: Review and approve from anywhere (future enhancement)

### For Requestors

1. **User-Friendly**: Simple, guided process for creating requests
2. **Status Tracking**: Real-time visibility into request progress
3. **Draft Capability**: Save and edit requests before submission
4. **Clear Feedback**: Understand why requests are rejected
5. **Documentation**: All documents stored securely in one place

## Business Requirements Summary

### Functional Requirements

1. **Team-Specific Forms**: Each team has its own form template with custom fields
2. **Team-Specific Workflows**: Each team has its own approval workflow
3. **Multi-Step Approval**: Sequential approval steps with multiple approvers per step
4. **Document Management**: Secure file upload and storage with versioning
5. **Status Tracking**: Real-time status updates and progress tracking
6. **Audit Trail**: Complete field-level audit logging
7. **Finance Integration**: Seamless handoff to Finance for payment processing
8. **Email Notifications**: Automated email on request completion

### Non-Functional Requirements

1. **Performance**: System handles 500+ concurrent users
2. **Security**: Role-based access control, encrypted file storage
3. **Reliability**: 99.5% uptime, no data loss
4. **Scalability**: Support for 50+ teams, 10+ workflow steps
5. **Usability**: Intuitive interface, minimal training required
6. **Maintainability**: Well-documented, modular architecture

## Business Process Improvements

### Before PRS

- **Average Processing Time**: 2-3 weeks from request to payment
- **Rejection Rate**: 15-20% due to missing information
- **Document Loss**: 5-10% of requests had missing documents
- **Audit Preparation**: 2-3 days to gather audit documentation
- **Approval Visibility**: Limited, required manual follow-up

### After PRS

- **Average Processing Time**: 1-2 weeks (30-40% reduction)
- **Rejection Rate**: 5-10% (50% reduction)
- **Document Loss**: 0% (all documents stored in system)
- **Audit Preparation**: Minutes (complete audit trail available)
- **Approval Visibility**: Real-time status for all stakeholders

## Implementation Phases

### Phase 1: Core Functionality (Current)

- Team-specific forms and workflows
- Multi-step approval process
- Document management
- Finance review and completion
- Basic audit trail
- Email notifications

### Future Phases (Planned)

- Budget tracking and limits
- ERP/accounting system integration
- Advanced reporting and analytics
- Mobile application
- Real-time notifications (email/SMS)
- Vendor management
- SLA tracking and escalations

## Success Criteria

The PRS project is considered successful when:

1. ✅ All teams can create requests using their own forms
2. ✅ All teams have unique, linear approval workflows
3. ✅ Supporting documents can be uploaded and stored securely
4. ✅ Finance reliably receives fully approved requests
5. ✅ Level 2 field-level audit trail exists for all requests
6. ✅ Completion emails are sent automatically
7. ✅ System supports 500+ concurrent users
8. ✅ Request load time < 2 seconds
9. ✅ Zero data loss
10. ✅ 100% audit trail coverage

## Conclusion

The Purchase Request System (PRS) transforms the procurement process from a manual, fragmented workflow into a standardized, transparent, and efficient digital system. By providing team-specific customization while maintaining organizational standards, PRS ensures compliance, accountability, and efficiency throughout the procurement lifecycle.

The system's comprehensive audit trail, secure document management, and automated workflow progression provide significant value to all stakeholders - from requestors who benefit from a user-friendly process, to approvers who gain visibility and efficiency, to Finance who receives complete, compliant requests ready for payment processing.

With its scalable architecture and focus on user experience, PRS positions the organization for continued growth while maintaining strict control and compliance over procurement activities.

---

**Document Version**: 1.0  
**Last Updated**: 2025  
**Contact**: [Your Contact Information]






