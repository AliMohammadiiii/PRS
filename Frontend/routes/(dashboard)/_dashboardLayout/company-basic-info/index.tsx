import { createFileRoute, redirect } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from 'injast-core/components';
import { useAuth } from 'src/client/contexts/AuthContext';
import { useCompany } from 'src/client/contexts/CompanyContext';
import PageHeader from '../../components/PageHeader';
import CompanyBasicInfoForm from './components/CompanyBasicInfoForm';
import * as orgApi from 'src/services/api/organizations';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/company-basic-info/')({
  component: CompanyBasicInfoPage,
  beforeLoad: ({ context }) => {
    // Only allow normal users (non-admin) to access this page
    // This will be checked in the component as well
  },
});

function CompanyBasicInfoPage() {
  const { user } = useAuth();
  const { selectedCompany, isLoading: companyLoading } = useCompany();
  const [companyData, setCompanyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if admin user
  if (user?.is_admin) {
    throw redirect({ to: '/' });
  }

  // Load company data
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!selectedCompany) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await orgApi.getOrgNode(selectedCompany.id);
        setCompanyData(data);
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
          err.message ||
          'خطا در بارگذاری اطلاعات شرکت'
        );
        logger.error('Error loading company data:',  err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanyData();
  }, [selectedCompany]);

  if (companyLoading || isLoading) {
    return (
      <>
        <PageHeader title="اطلاعات پایه شرکت" breadcrumb={['اطلاعات پایه شرکت']} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="اطلاعات پایه شرکت" breadcrumb={['اطلاعات پایه شرکت']} />
        <Box sx={{ p: 3, bgcolor: '#fee', borderRadius: 2, mt: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </>
    );
  }

  if (!selectedCompany) {
    return (
      <>
        <PageHeader title="اطلاعات پایه شرکت" breadcrumb={['اطلاعات پایه شرکت']} />
        <Box sx={{ p: 3, bgcolor: '#fff3cd', borderRadius: 2, mt: 3 }}>
          <Typography>لطفاً یک شرکت را انتخاب کنید</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader title="اطلاعات پایه شرکت" breadcrumb={['اطلاعات پایه شرکت']} />
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 4,
          py: 6,
          mt: 3,
        }}
      >
        <CompanyBasicInfoForm
          companyData={companyData}
          userData={user}
          selectedCompany={selectedCompany}
          onSave={async (data) => {
            try {
              await orgApi.updateOrgNode(selectedCompany.id, data);
              // Reload company data
              const updated = await orgApi.getOrgNode(selectedCompany.id);
              setCompanyData(updated);
            } catch (err: any) {
              throw new Error(
                err.response?.data?.detail ||
                err.message ||
                'خطا در ذخیره اطلاعات'
              );
            }
          }}
        />
      </Box>
    </>
  );
}






