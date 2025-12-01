UI Component Specification Guide (Injast-Core)

0. Installation & Tech Stack

npm install injast-core --registry=https://pkg.injast.life/repository/npm-injast-group/

Core stack (assumed):  ￼
	•	React 18 + TypeScript
	•	TanStack Router (file-based routing)
	•	Injast-Core (injast-core/components, injast-core/constants, injast-core/utils, injast-core/hooks)
	•	MUI DataGrid (@mui/x-data-grid)
	•	react-hook-form + zod (forms)
	•	RTL language support (fa-IR)

⸻

1. Purpose of This Guide

This guide defines how to:
	1.	Specify UI components (structure, props, behaviors, variants).
	2.	Implement them using Injast-Core primitives.
	3.	Keep consistency across pages: forms, tables, layout, RTL, theming, and URL-driven state.

Use it both as:
	•	A template when designing new components.
	•	A reference when implementing components in code.

⸻

2. Standard UI Component Specification Template

For every component (e.g., PageHeader, Tab, CustomerForm) write a spec in this shape:

## Component Name

**Code name:** `PageHeader`  
**Layer:** App-level / Shared / Feature-level  
**Status:** Draft / Implemented / Deprecated  

### 1. Purpose

Short description of what this component does and where it is used.

### 2. Usage Context

- Pages/routes using it
- Devices / breakpoints expectations (desktop-only, responsive, etc.)
- Dependencies (e.g., TanStack Router, react-hook-form, DataGrid)

### 3. Props API (TypeScript)

```ts
type PageHeaderProps = {
  title: string;
  breadcrumb: string[];
  actions?: ReactNode;   // buttons, filters, etc.
}

4. States & Behavior
	•	Visual states (default, hover, disabled, loading, error, etc.)
	•	Controlled / uncontrolled behavior
	•	Integration with URL search params (if any)
	•	Interaction with forms / modals / DataGrid

5. Layout & Styling
	•	How it aligns inside parent layouts (Grid, Box)
	•	Spacing, padding, margins
	•	Colors and typography tokens from defaultColors / appColors

6. RTL, Accessibility, i18n
	•	RTL or LTR direction
	•	Keyboard navigation, focus handling
	•	Texts externalized for translation (if needed)

7. Variants
	•	Example: PageHeader with/without actions
	•	Example: Button primary / secondary / ghost

8. Code Snippet (Canonical Implementation)

Include the single canonical implementation that others should copy.

⸻

3. Core Building Blocks (Injast-Core Primitives)

3.1 Import Conventions

// Components
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
  IconButton,
  Select,
  MenuItem,
  Modal,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  OtpInput,
} from 'injast-core/components';

// Colors & constants
import { defaultColors } from 'injast-core/constants';

// Hooks & utils
import { useErrorHandler } from 'injast-core/hooks';
import { createQueryParams, longFormatInWords, coreFaIR } from 'injast-core/utils';

These are the base for layout, typography, inputs, modals, and feedback.

⸻

4. Layout & Shell Components

4.1 App Layout Spec

Component: DashboardLayout
Responsibility: Root shell for all authenticated pages.  ￼

Props
None (it is a route layout wrapper).

Layout
	•	12-column Grid:
	•	Grid size={2} → Sidebar
	•	Grid size={10} → Header + Content
	•	Content background: defaultColors.neutral[50]
	•	Full-height viewport.

Canonical Implementation

import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Box, Grid } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import SideBar from './components/SideBar';
import Header from './components/Header';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout')({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <Grid container sx={{ height: '100%' }}>
      <Grid size={2} sx={{ height: '100%' }}>
        <SideBar />
      </Grid>
      <Grid size={10}>
        <Header />
        <Box
          sx={{
            bgcolor: defaultColors.neutral[50],
            height: '100%',
            py: 4,
            px: 3,
          }}
        >
          <Outlet />
        </Box>
      </Grid>
    </Grid>
  );
}


⸻

4.2 Page Header Spec

Component: PageHeader  ￼

Props

type PageHeaderProps = {
  title: string;
  breadcrumb: string[];
  actions?: ReactNode; // right side, e.g., buttons, filters
};

Behavior
	•	Displays current page title.
	•	Breadcrumb items separated by /.
	•	Last breadcrumb is emphasized.

Canonical Implementation

import { Box, Grid, Typography } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { ArrowRight } from 'iconsax-reactjs';
import { FC, Fragment, ReactNode } from 'react';

const PageHeader: FC<PageHeaderProps> = ({ title, breadcrumb, actions }) => {
  return (
    <Grid container sx={{ height: 76 }}>
      <Grid
        size={12}
        sx={{
          bgcolor: defaultColors.neutral[50],
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
          <ArrowRight color={defaultColors.neutral.dark} size={32} />
          <Box>
            <Typography variant="display2" color="neutral.dark">
              {title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, pt: 2 }}>
              {breadcrumb.map((text, index) => {
                const isLast = index === breadcrumb.length - 1;
                return (
                  <Fragment key={index}>
                    <Typography
                      variant="body2"
                      color={isLast ? 'neutral.main' : 'neutral.light'}
                    >
                      {text}
                    </Typography>
                    {!isLast && (
                      <Typography color="neutral.light" variant="body2">
                        /
                      </Typography>
                    )}
                  </Fragment>
                );
              })}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'end', gap: 3 }}>
          {actions}
        </Box>
      </Grid>
    </Grid>
  );
};

export default PageHeader;


⸻

4.3 Content Container Spec (ContentBox)

Component: ContentBox
Responsibility: Scrollable white card that fills the remaining viewport below header/tabs.  ￼

Canonical Implementation

import { Box } from 'injast-core/components';
import { FC, ReactNode, useEffect, useState } from 'react';
import { PAGE_TABS_ID } from 'src/shared/constants';

type ContentBoxProps = {
  children: ReactNode;
};

const ContentBox: FC<ContentBoxProps> = ({ children }) => {
  const tabEl = document.getElementById(PAGE_TABS_ID);
  const headerHeight = tabEl ? 248 : 172;
  const [remaining, setRemaining] = useState(window.innerHeight - headerHeight);

  useEffect(() => {
    const onResize = () => setRemaining(window.innerHeight - headerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [headerHeight]);

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: 2,
        height: remaining,
        overflow: 'auto',
        px: 4,
        py: 6,
      }}
    >
      {children}
    </Box>
  );
};

export default ContentBox;


⸻

5. Form Components & Patterns

5.1 Form Stack Spec

Stack:
	•	Validation: zod
	•	State: react-hook-form
	•	Design: TextField, Button, Radio, Select from Injast-Core  ￼

Standard Form Spec Sections
	1.	Schema (zod)
	2.	Type (z.infer)
	3.	Form initialization (useForm)
	4.	Submit flow (loading, error)
	5.	Field components (TextField, Select, etc.)

⸻

5.2 TextField (Canonical Spec)

Component: TextField from Injast-Core
Used for: Single-line text, numeric input, search bar.  ￼

Patterns
	1.	Basic with react-hook-form

import { TextField, Box, Button, Typography } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  mobile: z
    .string()
    .length(11, 'شماره موبایل اشتباهه.')
    .refine((val) => val.startsWith('09'), {
      message: 'شماره موبایل اشتباهه.',
    }),
});

type FormData = z.infer<typeof schema>;

const MobileLoginForm = () => {
  const [loading, setLoading] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    // handle
    setLoading(false);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h2" fontWeight={700}>
        ورود به برنامه
      </Typography>
      <TextField
        label="شماره موبایل"
        disabled={loading}
        startAdornment={<Call size={20} color={defaultColors.neutral.light} />}
        {...register('mobile')}
        error={!!errors.mobile}
        helperText={errors.mobile?.message}
        inputProps={{
          inputMode: 'numeric',
          pattern: '[0-9]*',
          onKeyPress: (e) => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
          },
        }}
      />
      <Button type="submit" variant="contained" loading={loading} disabled={!isValid}>
        ادامه
      </Button>
    </Box>
  );
};

Spec Highlights:
	•	Always connect via register.
	•	Show errors with error + helperText.
	•	For numeric fields, use inputMode, pattern, and onKeyPress.

	2.	Search TextField

<TextField
  fullWidth
  height={40}
  size="small"
  startAdornment={<SearchNormal1 size={20} color={defaultColors.neutral.light} />}
  placeholder="جستجوی مشتری"
/>

Use this pattern for search bars in list pages.  ￼

⸻

5.3 OTP Input Spec

Component: OtpInput
Usage: Multi-digit code input.  ￼

Canonical Implementation

import { Box, Button, Typography, OtpInput } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { appColors } from 'src/theme/colors';
import { useForm } from 'react-hook-form';

type FormValues = { otp: string };

const OtpForm = () => {
  const [otp, setOtp] = React.useState('');
  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<FormValues>({ defaultValues: { otp: '' } });

  React.useEffect(() => {
    setValue('otp', otp);
  }, [otp, setValue]);

  const onSubmit = (values: FormValues) => {
    // Submit OTP
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h2" mb={4}>
        کد تایید را وارد کن
      </Typography>
      <OtpInput
        value={otp}
        onChange={setOtp}
        length={5}
        separator={<span style={{ paddingLeft: '4px' }} />}
        inputProps={{
          width: '46px',
          height: '48px',
          backgroundColor: defaultColors.neutral[100],
          focusedBorderColor: appColors.primary.main,
          error: !!errors.otp,
        }}
      />
      <input type="hidden" {...register('otp')} />
      <Button type="submit" variant="contained" sx={{ mt: 4 }}>
        تایید
      </Button>
    </Box>
  );
};

Spec Points:
	•	OtpInput is controlled via value + onChange.
	•	For form integration, use a hidden input registered to otp.
	•	Styling via inputProps with design tokens.

⸻

5.4 RadioGroup Spec

Component: RadioGroup + FormControl + FormControlLabel + Radio  ￼

Canonical Implementation

const [value, setValue] = useState('customer');

const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
  setValue((event.target as HTMLInputElement).value);
};

<FormControl>
  <RadioGroup row value={value} onChange={handleChange} sx={{ ml: 3 }}>
    <FormControlLabel
      sx={{
        border: 1,
        borderRadius: 2,
        pr: 3,
        borderColor: defaultColors.neutral[300],
        color: defaultColors.neutral.main,
      }}
      value="customer"
      control={<Radio size="small" />}
      label="مشتری"
    />
    {/* add another FormControlLabel if needed */}
  </RadioGroup>
</FormControl>;


⸻

5.5 Select & MenuItem Spec (Pagination / Filters)

Component: Select, MenuItem  ￼

Canonical Implementation

<Select
  value={limit}
  size="small"
  onChange={(e) => {
    const newLimit = e.target.value as number;
    updateSearchParams({ limit: newLimit });
    if (onLimitChange) onLimitChange(newLimit);
  }}
>
  {LIMIT.map((el) => (
    <MenuItem key={el} value={el}>
      {el}
    </MenuItem>
  ))}
</Select>

Use this pattern whenever you map option arrays to MenuItems.

⸻

6. Data Presentation Components

6.1 DataGrid Spec (MUI X + Injast-Core Shell)

Component: InvoiceTable (pattern for any DataGrid table)  ￼

Key Standards
	•	Columns generated from API metadata when possible.
	•	Rows enriched with local id field.
	•	Uses URL search params for pagination state (page, limit).
	•	Use DataGridPagination as custom pagination component.
	•	Use useErrorHandler for consistent error handling.

Canonical Implementation Skeleton

import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box } from 'injast-core/components';
import { useErrorHandler } from 'injast-core/hooks';
import { createQueryParams } from 'injast-core/utils';

const InvoiceTable: FC = () => {
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleError } = useErrorHandler();
  const { page, limit } = routeApi.useSearch();

  const createColumns = (specs: ReportColumn[]): GridColDef[] =>
    specs.map((spec) => {
      let col: GridColDef = {
        field: spec.key,
        headerName: spec.title,
        width: 150,
      };

      switch (spec.key) {
        case 'paid_at':
          col.cellClassName = 'app-datagrid__cell--dir-ltr';
          break;
        case 'total_rial_amount':
          col.type = 'number';
          col.valueFormatter = (value?: string) => {
            if (value && !isNaN(+value)) return addCommas(value);
          };
          break;
        case 'status':
          col = {
            ...col,
            width: 250,
            renderCell: (params: GridRenderCellParams<InvoiceRow, string>) => (
              <>{getInvoiceStatusText(params.row.status)}</>
            ),
          };
          break;
      }
      return col;
    });

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = createQueryParams({ page, limit });
      const data = await fetchInvoiceReport(queryParams);
      const cols = createColumns(data.data.columns);
      const mappedRows = data.data.rows.map((r, index) => ({ ...r, id: `row-${index}` }));
      if (!columns.length) setColumns(cols);
      setRows(mappedRows);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit]);

  return (
    <ContentBox>
      <Box display="flex" flexDirection="column" dir="rtl" minHeight={400}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          slots={{
            loadingOverlay: DataGridLoading,
            pagination: () => (
              <DataGridPagination
                count={Math.round(totalItemCount / limit)}
                page={page}
                limit={limit}
              />
            ),
          }}
        />
      </Box>
    </ContentBox>
  );
};


⸻

7. Navigation & Tabs

7.1 Tab Component Spec

Component: Tab  ￼

Responsibilities
	•	Horizontal tab list with scrolling arrows.
	•	Optional integration with URL search params (active_tab).
	•	Emits onChange when selection changes.

Props

type TabProps = {
  tabs: { label: string; value: string; disable?: boolean }[];
  onChange?: (tab: string) => void;
  activeTab?: string;
  setValueInSearchParams?: boolean; // defaults to true
};

Key Behaviors
	•	Uses updateSearchParams to store active_tab, and resets page + limit.
	•	Uses useOnScreen + IntersectionObserver to show/hide scroll arrows.  ￼

⸻

7.2 TabPanel Spec

Component: TabPanel  ￼

Behavior
	•	Renders children only when value === activeTab.
	•	If activeTab prop is missing, reads it from URL search params.

type TabPanelProps = {
  value: string;
  activeTab?: string;
  children: ReactNode;
};

const TabPanel: FC<TabPanelProps> = ({ value, activeTab, children }) => {
  if (!activeTab) {
    const search = useSearch({ strict: false });
    if (search?.active_tab) activeTab = search.active_tab;
    else throw new Error('no active no render panel');
  }

  return <>{value === activeTab && children}</>;
};


⸻

8. Modals & Confirmation

8.1 RemoveModal Spec

Component: RemoveModal  ￼

Props

type RemoveModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onRemove: () => void;
};

Key Rules
	•	Always use clear title and short description.
	•	Primary action color: color="error" (delete).
	•	Secondary action: outlined neutral button.

⸻

9. Theming, RTL, and Providers

9.1 Provider Setup Spec

Component: Providers (root)  ￼

import { MessageProvider } from 'injast-core/context';
import { SPAThemeProvider } from 'injast-core/providers';
import { appColors } from 'src/theme/colors';
import { faIR } from '@mui/x-data-grid/locales';
import { coreFaIR } from 'injast-core/utils';

export default function Providers({ children }: { children: ReactNode }) {
  const options = {
    ...coreFaIR,
    ...faIR,
  };

  return (
    <SPAThemeProvider dir="rtl" appColors={appColors} themeOptions={options}>
      <MessageProvider
        width="350px"
        toastPosition={{ vertical: 'top', horizontal: 'center' }}
      >
        {children}
      </MessageProvider>
    </SPAThemeProvider>
  );
}

Spec Points:
	•	dir="rtl" enforced at theme level.
	•	Merges Injast-Core and DataGrid fa-IR locales.
	•	Global toast configuration centralized.

9.2 Colors & SX Standards
	•	Use defaultColors.neutral[50] for light backgrounds.
	•	defaultColors.neutral.main and .dark for primary text.
	•	Component sx objects should be composed of spacing, colors, borderRadius, flex; avoid hard-coded hex colors except in appColors theme file.  ￼

⸻

10. URL-Driven State & Routing

10.1 Search Params Standard
	•	All pagination / filters / active tabs must use URL search params.
	•	Pattern:

const pageSearchSchema = z.object({
  page: z.number().catch(1),
  limit: z.number().catch(INITIAL_LIMIT),
  active_tab: z.enum(['invoice', 'withdraw', 'sod']).catch('invoice'),
});

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/transactions/')({
  component: TransactionPage,
  validateSearch: (search) => pageSearchSchema.parse(search),
});

Use updateSearchParams helper for updates.  ￼

⸻

11. Example: Complete Page Spec

You can imagine a “Transactions Page” spec that references all of the above:
	•	Layout: DashboardLayout → PageHeader → Tab + TabPanel → ContentBox → DataGrid
	•	State: page, limit, active_tab in URL
	•	Forms: Search TextField (customers filter), Select for “per page”
	•	Theming: Colors from defaultColors, appColors, RTL

Document that page by linking to each component spec and the canonical implementation.
