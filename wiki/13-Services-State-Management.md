# Services & State Management

## API Services

### Base API Client

**Location**: `Frontend/libs/apiRequest.ts`

**Configuration**:
- Base URL from config
- JWT token injection
- Token refresh handling
- Error interceptors

**Usage**:
```typescript
import { apiRequest } from 'src/libs/apiRequest';

const response = await apiRequest.get('/api/prs/requests/');
```

### Authentication Service

**Location**: `Frontend/services/api/auth.ts`

**Functions**:
- `login(data: LoginRequest): Promise<LoginResponse>`
- `refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse>`
- `verifyToken(data: VerifyTokenRequest): Promise<void>`
- `getMe(): Promise<UserMeResponse>`

**Usage**:
```typescript
import * as authApi from 'src/services/api/auth';

const response = await authApi.login({ username, password });
sessionStorage.setItem('access_token', response.access);
```

### PRS Service

**Location**: `Frontend/services/api/prs.ts`

#### Teams

- `getTeams(): Promise<Team[]>`
- `getTeamFormTemplate(teamId: string): Promise<FormTemplateResponse>`
- `getAttachmentCategories(teamId: string): Promise<AttachmentCategory[]>`

#### Purchase Requests

- `createPurchaseRequest(data: PurchaseRequestCreateRequest): Promise<PurchaseRequest>`
- `updatePurchaseRequest(id: string, data: PurchaseRequestUpdateRequest): Promise<PurchaseRequest>`
- `getPurchaseRequest(id: string): Promise<PurchaseRequest>`
- `submitPurchaseRequest(id: string, data?: SubmitRequestRequest): Promise<PurchaseRequest>`
- `fetchMyRequests(params?: PrsMyRequestsFilters): Promise<PrsMyRequestsResponse>`
- `getMyApprovals(params?: PrsInboxFilters): Promise<PurchaseRequest[]>`
- `getFinanceInbox(params?: PrsFinanceInboxFilters): Promise<PurchaseRequest[]>`
- `fetchAllRequests(params?: PrsMyRequestsFilters): Promise<PrsMyRequestsResponse>` (admin)

#### Approval Actions

- `approveRequest(requestId: string, data?: ApproveRequestRequest): Promise<PurchaseRequest>`
- `rejectRequest(requestId: string, data: RejectRequestRequest): Promise<PurchaseRequest>`
- `completeRequest(requestId: string, data?: CompleteRequestRequest): Promise<PurchaseRequest>`

#### Attachments

- `getRequestAttachments(requestId: string): Promise<Attachment[]>`
- `uploadAttachment(requestId: string, data: AttachmentUploadRequest): Promise<Attachment>`
- `deleteAttachment(requestId: string, attachmentId: string): Promise<void>`
- `downloadAttachment(requestId: string, attachmentId: string): Promise<Blob>`

#### Templates & Configurations

- `getFormTemplates(teamId?: string): Promise<FormTemplate[]>`
- `getAllFormTemplates(): Promise<FormTemplate[]>`
- `createFormTemplate(data: FormTemplateCreateRequest): Promise<FormTemplate>`
- `updateFormTemplate(id: string, data: Partial<FormTemplateCreateRequest>): Promise<FormTemplate>`
- `getAllWorkflowTemplates(): Promise<WorkflowTemplate[]>`
- `getTeamWorkflowTemplates(teamId?: string): Promise<WorkflowTemplate[]>`
- `getEffectiveTemplate(teamId: string, purchaseType: string): Promise<EffectiveTemplateResponse>`
- `getTeamPurchaseConfigs(teamId: string): Promise<TeamPurchaseConfig[]>`
- `createTeamPurchaseConfig(data: TeamPurchaseConfigCreateRequest): Promise<TeamPurchaseConfig>`

**Usage**:
```typescript
import * as prsApi from 'src/services/api/prs';

// Create request
const request = await prsApi.createPurchaseRequest({
  team: teamId,
  purchase_type: 'GOODS',
  vendor_name: 'Vendor',
  // ...
});

// Submit request
await prsApi.submitPurchaseRequest(request.id, {
  comment: 'Ready for approval',
  files: [file1, file2],
});
```

## State Management

### Authentication Context

**Location**: `Frontend/client/contexts/AuthContext.tsx`

**State**:
- `user: UserMeResponse | null`
- `isLoading: boolean`

**Methods**:
- `login(username: string, password: string): Promise<UserMeResponse>`
- `logout(): void`
- `refreshUser(): Promise<void>`

**Token Storage**:
- Access token: `sessionStorage.getItem('access_token')`
- Refresh token: `sessionStorage.getItem('refresh_token')`

**Usage**:
```typescript
import { useAuth } from 'src/client/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isLoading } = useAuth();
  
  if (isLoading) return <Loading />;
  if (!user) return <LoginForm onLogin={login} />;
  
  return <div>Welcome, {user.username}</div>;
}
```

### Team Context

**Location**: `Frontend/client/contexts/TeamContext.tsx`

**State**:
- `selectedTeam: Team | null`
- `teams: Team[]`

**Methods**:
- `setSelectedTeam(teamId: string): void`

**Usage**:
```typescript
import { useTeam } from 'src/client/contexts/TeamContext';

function MyComponent() {
  const { selectedTeam, teams, setSelectedTeam } = useTeam();
  
  return (
    <Select value={selectedTeam?.id} onChange={(e) => setSelectedTeam(e.target.value)}>
      {teams.map(team => (
        <option key={team.id} value={team.id}>{team.name}</option>
      ))}
    </Select>
  );
}
```

### TanStack Query

**Library**: `@tanstack/react-query`

**Query Client Setup**:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
```

#### Query Hooks

**Fetching Data**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { getPurchaseRequest } from 'src/services/api/prs';

function RequestDetail({ requestId }: { requestId: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['purchaseRequest', requestId],
    queryFn: () => getPurchaseRequest(requestId),
    enabled: !!requestId, // Only fetch if requestId exists
  });
  
  if (isLoading) return <Loading />;
  if (error) return <Error />;
  
  return <div>{data.subject}</div>;
}
```

**List Queries with Filters**:
```typescript
function MyRequests({ filters }: { filters: PrsMyRequestsFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['myRequests', filters],
    queryFn: () => fetchMyRequests(filters),
  });
  
  return <RequestsTable requests={data?.results || []} />;
}
```

#### Mutation Hooks

**Creating/Updating Data**:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPurchaseRequest } from 'src/services/api/prs';

function CreateRequestForm() {
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: createPurchaseRequest,
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries(['myRequests']);
      // Or update cache directly
      queryClient.setQueryData(['purchaseRequest', data.id], data);
    },
  });
  
  const onSubmit = (data) => {
    createMutation.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      <button disabled={createMutation.isLoading}>
        {createMutation.isLoading ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

**Optimistic Updates**:
```typescript
const approveMutation = useMutation({
  mutationFn: (data: ApproveRequestRequest) => approveRequest(requestId, data),
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['purchaseRequest', requestId]);
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['purchaseRequest', requestId]);
    
    // Optimistically update
    queryClient.setQueryData(['purchaseRequest', requestId], (old: PurchaseRequest) => ({
      ...old,
      status: { code: 'IN_REVIEW', name: 'In Review' },
    }));
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['purchaseRequest', requestId], context.previous);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries(['purchaseRequest', requestId]);
  },
});
```

## Form State Management

### React Hook Form

**Usage**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  vendor_name: z.string().min(1),
  subject: z.string().min(1),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      vendor_name: '',
      subject: '',
    },
  });
  
  const onSubmit = form.handleSubmit(async (data) => {
    await submitForm(data);
  });
  
  return (
    <form onSubmit={onSubmit}>
      <input {...form.register('vendor_name')} />
      {form.formState.errors.vendor_name && (
        <span>{form.formState.errors.vendor_name.message}</span>
      )}
    </form>
  );
}
```

### Dynamic Form State

**For Dynamic Forms**:
```typescript
const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

const handleFieldChange = (fieldId: string, value: any) => {
  setFieldValues(prev => ({
    ...prev,
    [fieldId]: value,
  }));
};

// Convert to API format
const apiData = convertFormValuesToApiFormat(fieldValues, formTemplate.fields);
```

## Error Handling

### Error Extraction

**Utility**: `Frontend/src/shared/utils/prsUtils.ts`

```typescript
import { extractErrorMessage } from 'src/shared/utils/prsUtils';

try {
  await apiCall();
} catch (error) {
  const message = extractErrorMessage(error);
  toast.error(message);
}
```

### Toast Notifications

**Usage**:
```typescript
import { toast } from '@/hooks/use-toast';

toast.success('Request created successfully');
toast.error('Failed to create request');
toast.info('Request is being processed');
```

## Cache Management

### Query Invalidation

```typescript
// Invalidate specific query
queryClient.invalidateQueries(['purchaseRequest', requestId]);

// Invalidate all related queries
queryClient.invalidateQueries(['myRequests']);

// Invalidate all queries
queryClient.invalidateQueries();
```

### Cache Updates

```typescript
// Update cache directly
queryClient.setQueryData(['purchaseRequest', requestId], updatedRequest);

// Remove from cache
queryClient.removeQueries(['purchaseRequest', requestId]);
```

## Related Documentation

- [Frontend Overview](11-Frontend-Overview.md) - Frontend architecture
- [Routes & Components](12-Routes-Components.md) - Component usage
- [API Endpoints](09-API-Endpoints.md) - Backend API reference






