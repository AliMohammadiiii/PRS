# Routes & Components

## Route Structure

### Main Routes

#### `/login`
Login page for user authentication.

**Component**: `Frontend/routes/login.tsx`

**Features**:
- Username/password login
- JWT token management
- Redirect to dashboard on success

#### `/(dashboard)/_dashboardLayout/`
Main dashboard layout with sidebar and header.

**Layout Component**: `Frontend/routes/(dashboard)/_dashboardLayout.tsx`

**Features**:
- Sidebar navigation
- Header with user info and team selector
- Page header component
- Main content area

### PRS Routes

#### `/prs/requests/new/`
Create a new purchase request.

**Component**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/requests/new/index.tsx`

**Features**:
- Team and purchase type selection
- Dynamic form based on form template
- Attachment upload
- Draft saving
- Request submission

**Query Parameters**:
- `requestId`: Optional, for editing existing request

#### `/prs/requests/$requestId/`
View and edit purchase request details.

**Component**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/requests/$requestId/index.tsx`

**Features**:
- Request detail view
- Field values display
- Attachment list
- Approval history
- Audit trail
- Approval/reject actions (if applicable)
- Edit mode (for draft/rejected requests)

#### `/prs/my-requests/`
User's own purchase requests.

**Component**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/my-requests/index.tsx`

**Features**:
- Request list with filters
- Status filtering
- Team filtering
- Date range filtering
- Pagination

#### `/prs/inbox/`
Approval inbox for approvers.

**Component**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/inbox/index.tsx`

**Features**:
- Requests pending approval
- Filter by team, status, date
- Quick approve/reject actions
- Pagination

#### `/prs/finance/`
Finance review inbox.

**Component**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/finance/index.tsx`

**Features**:
- Fully approved requests
- Finance completion actions
- Request details
- Pagination

### Admin Routes

#### `/prs/admin/teams/`
Team management (admin only).

**Component**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/admin/teams/index.tsx`

**Features**:
- Create/edit teams
- Deactivate teams
- Team list

#### `/prs/admin/workflows/`
Workflow template management (admin only).

**Component**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/admin/workflows/index.tsx`

**Features**:
- Create/edit workflow templates
- Add/remove steps
- Assign approvers to steps
- Workflow versioning

#### `/prs/admin/form-templates/`
Form template management (admin only).

**Component**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/admin/form-templates/index.tsx`

**Features**:
- Create/edit form templates
- Add/remove/reorder fields
- Field configuration
- Template versioning

#### `/prs/admin/team-configs/`
Team purchase configuration (admin only).

**Component**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/admin/team-configs/index.tsx`

**Features**:
- Configure team + purchase type → template mapping
- Create/edit configurations
- Active configuration management

## Key Components

### Layout Components

#### `SideBar`
Navigation sidebar.

**Location**: `Frontend/routes/(dashboard)/components/SideBar.tsx`

**Features**:
- Navigation menu
- Active route highlighting
- Collapsible sections

#### `Header`
Top header bar.

**Location**: `Frontend/routes/(dashboard)/components/Header.tsx`

**Features**:
- User info
- Team selector (for non-admins)
- Logout button
- Notifications (future)

#### `PageHeader`
Page title and breadcrumbs.

**Location**: `Frontend/routes/(dashboard)/components/PageHeader.tsx`

**Usage**:
```tsx
<PageHeader title="Create Request" breadcrumbs={[...]} />
```

### PRS Components

#### `PrsDynamicForm`
Dynamic form component based on form template.

**Location**: `Frontend/components/prs/PrsDynamicForm.tsx`

**Features**:
- Renders form fields based on template
- Supports all field types (TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN)
- Field validation
- Required field indicators
- Help text display

**Props**:
```typescript
interface PrsDynamicFormProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}
```

**Usage**:
```tsx
<PrsDynamicForm
  fields={formTemplate.fields}
  values={fieldValues}
  onChange={(fieldId, value) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  }}
  errors={fieldErrors}
/>
```

#### `PrsAttachmentsPanel`
Attachment upload and management panel.

**Location**: `Frontend/components/prs/PrsAttachmentsPanel.tsx`

**Features**:
- File upload (drag & drop or file picker)
- Attachment list
- Category assignment
- File deletion (if allowed)
- Required attachment indicators
- File preview (future)

**Props**:
```typescript
interface PrsAttachmentsPanelProps {
  requestId?: string;
  attachments: Attachment[];
  categories: AttachmentCategory[];
  onUpload: (file: File, categoryId?: string) => Promise<void>;
  onDelete?: (attachmentId: string) => Promise<void>;
  highlightRequired?: boolean;
  disabled?: boolean;
}
```

**Usage**:
```tsx
<PrsAttachmentsPanel
  requestId={request.id}
  attachments={attachments}
  categories={attachmentCategories}
  onUpload={handleUpload}
  onDelete={handleDelete}
  highlightRequired={highlightRequiredAttachments}
/>
```

#### `PrsRequestDetail`
Purchase request detail view.

**Location**: `Frontend/components/prs/PrsRequestDetail.tsx`

**Features**:
- Request information display
- Field values display
- Status and workflow step
- Approval history
- Audit trail
- Attachment list

#### `PrsApprovalActions`
Approval/reject action buttons.

**Location**: `Frontend/components/prs/PrsApprovalActions.tsx`

**Features**:
- Approve button
- Reject button (with comment required)
- Comment input
- File upload during approval
- Action confirmation

**Usage**:
```tsx
<PrsApprovalActions
  request={request}
  onApprove={handleApprove}
  onReject={handleReject}
  canApprove={canApprove}
  canReject={canReject}
/>
```

### Form Components

#### `TeamSelector`
Team selection component.

**Location**: `Frontend/routes/(dashboard)/_dashboardLayout/prs/requests/new/components/TeamSelector.tsx`

**Features**:
- Team dropdown
- Purchase type selection
- Effective template fetching
- Team configuration display

#### Form Field Components

Individual field type components:

- `TextField`: Text input
- `NumberField`: Number input
- `DateField`: Date picker
- `BooleanField`: Checkbox/toggle
- `DropdownField`: Select dropdown
- `FileUploadField`: File input (uses Attachment system)

### Table Components

#### `RequestsTable`
Purchase request list table.

**Features**:
- Sortable columns
- Filterable rows
- Pagination
- Row actions (view, edit, approve, etc.)
- Status badges

**Columns**:
- Request ID
- Subject
- Requestor
- Team
- Status
- Current Step
- Vendor
- Created Date
- Actions

### Modal Components

#### `SubmitModal`
Confirmation modal for request submission.

**Features**:
- Comment input
- File upload
- Confirmation message
- Submit button

#### `ApproveModal`
Approval confirmation modal.

**Features**:
- Optional comment
- File upload
- Confirmation

#### `RejectModal`
Rejection modal.

**Features**:
- Required comment (min 10 characters)
- File upload
- Confirmation

## Component Patterns

### Data Fetching Pattern

```tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPurchaseRequest, updatePurchaseRequest } from 'src/services/api/prs';

function RequestDetail({ requestId }: { requestId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['purchaseRequest', requestId],
    queryFn: () => getPurchaseRequest(requestId),
  });
  
  const updateMutation = useMutation({
    mutationFn: (data: PurchaseRequestUpdateRequest) => 
      updatePurchaseRequest(requestId, data),
    onSuccess: () => {
      // Invalidate query to refetch
      queryClient.invalidateQueries(['purchaseRequest', requestId]);
    },
  });
  
  if (isLoading) return <Loading />;
  
  return <div>{data.subject}</div>;
}
```

### Form Handling Pattern

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });
  
  const onSubmit = async (data) => {
    try {
      await submitForm(data);
      toast.success('Success');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Error Handling Pattern

```tsx
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from 'src/shared/utils/prsUtils';

try {
  await apiCall();
  toast.success('Operation successful');
} catch (error) {
  const message = extractErrorMessage(error);
  toast.error(message || 'An error occurred');
}
```

## Related Documentation

- [Frontend Overview](11-Frontend-Overview.md) - Frontend architecture
- [Services & State Management](13-Services-State-Management.md) - API services
- [API Endpoints](09-API-Endpoints.md) - Backend API





