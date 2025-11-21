import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Box, Grid, TextField } from 'injast-core/components';
import { SearchNormal1, Add } from 'iconsax-reactjs';
import { defaultColors } from 'injast-core/constants';
import { useState, useEffect } from 'react';
import { INITIAL_LIMIT } from 'src/shared/constants';
import { updateSearchParams } from 'src/shared/utils/updateSearchParams';
import PageHeader from '../../components/PageHeader';
import ReportsTable from './components/ReportsTable';
import { useAuth } from 'src/client/contexts/AuthContext';
import { useCompany } from 'src/client/contexts/CompanyContext';
import { z } from 'zod';

const pageSearchSchema = z.object({
  page: z.number().catch(1),
  limit: z.number().catch(INITIAL_LIMIT),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/reports/')({
  component: ReportsPage,
  validateSearch: (search) => pageSearchSchema.parse(search),
});

function ReportsPage() {
  const { search: searchParam } = Route.useSearch();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState(searchParam || '');

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    updateSearchParams({ search: value || undefined, page: 1 });
  };

  const handleNewReport = () => {
    if (selectedCompany) {
      navigate({ 
        to: '/reports/submit',
        search: { companyId: selectedCompany.id }
      });
    } else {
      navigate({ to: '/reports/submit' });
    }
  };


  // Only show "New Report" button for non-admin users
  const isAdmin = user?.is_admin ?? false;
  const showNewReportButton = !isAdmin;

  return (
    <>
      <PageHeader title="گزارش‌ها" breadcrumb={['گزارش‌ها']}>
        {showNewReportButton && (
          <button
            onClick={handleNewReport}
            className="bg-app-teal hover:bg-app-teal/90 text-white flex items-center justify-center rounded-lg cursor-pointer transition-colors"
            style={{
              width: '157px',
              height: '40px',
              padding: '10px 0px',
              gap: '4px',
              fontFamily: 'IRANYekanXFaNum',
              fontWeight: 700,
              fontSize: '14px',
              lineHeight: '20px',
            }}
          >
            <span className="text-center text-white">گزارش جدید</span>
            <Add size={20} color="#FFFFFF" />
          </button>
        )}
      </PageHeader>

      {/* Reports Table */}
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 4,
          py: 6,
          mt: 3,
        }}
      >
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={12}>
            <TextField
              height={48}
              size="small"
              fullWidth
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              startAdornment={
                <SearchNormal1
                  size={20}
                  color={defaultColors.neutral.light}
                />
              }
              placeholder="جستجوی گزارش‌ها"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
            />
          </Grid>
        </Grid>
        <ReportsTable />
      </Box>
    </>
  );
}

