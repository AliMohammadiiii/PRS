# Frontend Overview

## Technology Stack

### Core Technologies

- **React 19**: UI library
- **TypeScript**: Type safety
- **TanStack Router**: File-based routing
- **TanStack Query**: Data fetching and caching
- **Vite**: Build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives

### Additional Libraries

- **React Hook Form**: Form management
- **Zod**: Schema validation
- **Material-UI (MUI)**: Component library (injast-core)
- **Lucide React**: Icon library
- **date-fns**: Date utilities

## Project Structure

```
Frontend/
├── client/              # React application code
│   ├── contexts/       # React contexts (Auth, Team)
│   ├── pages/          # Page components
│   └── ...
├── routes/             # TanStack Router routes
│   ├── (dashboard)/    # Dashboard layout routes
│   │   └── _dashboardLayout/
│   │       └── prs/    # PRS-specific routes
│   └── ...
├── services/           # API service layer
│   └── api/           # API client functions
├── types/              # TypeScript type definitions
├── components/         # Reusable components
├── shared/             # Shared utilities
├── libs/               # Library configurations
├── providers/          # React providers
├── theme/              # Theme configuration
├── config.ts           # Application configuration
└── vite.config.ts      # Vite configuration
```

## Application Architecture

### Routing

**Router**: TanStack Router (file-based routing)

**Base Path**:
- Development: `/`
- Production: `/PRS`

**Route Structure**:
- `/(dashboard)/_dashboardLayout/`: Main dashboard layout
- `/(dashboard)/_dashboardLayout/prs/`: PRS-specific routes
  - `requests/new/`: Create new request
  - `requests/$requestId/`: View/edit request
  - `my-requests/`: User's requests
  - `inbox/`: Approval inbox
  - `finance/`: Finance inbox
  - `admin/`: Admin routes
    - `teams/`: Team management
    - `workflows/`: Workflow management
    - `form-templates/`: Form template management
    - `team-configs/`: Team configuration

### State Management

#### Authentication State

**Context**: `AuthContext`

**Location**: `Frontend/client/contexts/AuthContext.tsx`

**Features**:
- User authentication state
- JWT token management (sessionStorage)
- Login/logout functions
- User profile fetching

**Usage**:
```typescript
import { useAuth } from 'src/client/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isLoading } = useAuth();
  
  if (isLoading) return <Loading />;
  if (!user) return <LoginForm />;
  
  return <div>Welcome, {user.username}</div>;
}
```

#### Team Context

**Context**: `TeamContext`

**Location**: `Frontend/client/contexts/TeamContext.tsx`

**Features**:
- Selected team state
- Team list
- Team switching

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

#### Data Fetching

**Library**: TanStack Query

**Usage**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { getPurchaseRequest } from 'src/services/api/prs';

function RequestDetail({ requestId }: { requestId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['purchaseRequest', requestId],
    queryFn: () => getPurchaseRequest(requestId),
  });
  
  if (isLoading) return <Loading />;
  if (error) return <Error />;
  
  return <div>{data.subject}</div>;
}
```

### API Client

#### Base Configuration

**Location**: `Frontend/libs/apiRequest.ts`

**Features**:
- JWT token injection
- Token refresh handling
- Error handling
- Request/response interceptors

**Configuration**:
```typescript
import { apiRequest } from 'src/libs/apiRequest';

// Base URL from config
const baseURL = config.apiBaseUrl; // e.g., 'http://localhost:8000'

// Automatic token injection
// Authorization: Bearer <token>
```

#### Service Modules

**Location**: `Frontend/services/api/`

**Modules**:
- `auth.ts`: Authentication endpoints
- `prs.ts`: Purchase request endpoints
- `users.ts`: User management
- `workflow.ts`: Workflow management
- `lookups.ts`: Lookup tables

**Example**:
```typescript
// Frontend/services/api/prs.ts
export async function getPurchaseRequest(id: string): Promise<PurchaseRequest> {
  const response = await apiRequest.get<PurchaseRequest>(`/api/prs/requests/${id}/`);
  return response.data;
}
```

### Configuration

#### Environment Configuration

**Location**: `Frontend/config.ts`

**Environments**:
- `LOCAL`: Development
- `DEV`: Development server
- `STAGE`: Staging
- `PROD`: Production

**Configuration**:
```typescript
const configs: Record<Environment, Config> = {
  LOCAL: {
    apiBaseUrl: 'http://localhost:8000',
    appName: 'PRS (Local)',
    appVersion: '0.0.1-local',
    appLang: 'fa-IR',
  },
  PROD: {
    apiBaseUrl: '/PRS',
    appName: 'PRS',
    appVersion: '1.0.0',
    appLang: 'fa-IR',
  },
};
```

### Component Structure

#### Layout Components

**Location**: `Frontend/routes/(dashboard)/_dashboardLayout.tsx`

**Features**:
- Sidebar navigation
- Header with user info
- Page header component
- Main content area

#### PRS Components

**Location**: `Frontend/components/prs/`

**Components**:
- `PrsDynamicForm`: Dynamic form based on form template
- `PrsAttachmentsPanel`: Attachment upload/management
- `PrsRequestDetail`: Request detail view
- `PrsApprovalActions`: Approval/reject actions

### Form Handling

#### React Hook Form + Zod

**Usage**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  vendor_name: z.string().min(1, 'Required'),
  subject: z.string().min(1, 'Required'),
});

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });
  
  const onSubmit = (data) => {
    // Submit form
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('vendor_name')} />
      {errors.vendor_name && <span>{errors.vendor_name.message}</span>}
    </form>
  );
}
```

### Styling

#### TailwindCSS

Utility-first CSS framework.

**Usage**:
```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-bold">Title</h2>
  <button className="px-4 py-2 bg-blue-500 text-white rounded">Button</button>
</div>
```

#### Radix UI Components

Accessible component primitives.

**Usage**:
```tsx
import { Dialog, DialogTrigger, DialogContent } from '@radix-ui/react-dialog';

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <p>Dialog content</p>
  </DialogContent>
</Dialog>
```

### Build & Development

#### Development Server

```bash
cd Frontend
npm run dev
```

**Default Port**: `5173` (Vite)

#### Production Build

```bash
npm run build
```

**Output**: `Frontend/dist/`

#### Build Configuration

**Location**: `Frontend/vite.config.ts`

**Features**:
- React plugin
- TypeScript support
- Path aliases (`@/` → `src/`)
- Environment variables

## Key Features

### Dynamic Forms

Forms are generated dynamically based on form templates:

1. User selects team and purchase type
2. System fetches effective template (form + workflow)
3. Form fields are rendered based on template
4. Field values are validated and submitted

### File Uploads

- Multipart form data for file uploads
- File type validation (PDF, JPG, PNG, DOCX, etc.)
- File size limits (10 MB)
- Attachment categories
- Progress indicators

### Real-time Updates

- TanStack Query for automatic refetching
- Optimistic updates for better UX
- Cache invalidation on mutations

### Error Handling

- Global error boundary
- API error handling
- User-friendly error messages
- Toast notifications

## Related Documentation

- [Routes & Components](12-Routes-Components.md) - Route and component details
- [Services & State Management](13-Services-State-Management.md) - API services and state
- [API Endpoints](09-API-Endpoints.md) - Backend API reference
- [Development Setup](05-Development-Setup.md) - Setup instructions







