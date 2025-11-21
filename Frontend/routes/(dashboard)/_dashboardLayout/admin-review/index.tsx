import { createFileRoute, useNavigate } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { AdminReviewGroupsTable } from './components/AdminReviewGroupsTable';
import { ReviewGroup } from 'src/types/api/review';
import * as reviewApi from 'src/services/api/review';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/admin-review/')({
  component: AdminReviewPage,
});

function AdminReviewPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await reviewApi.getReviewGroups();
      setGroups(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'خطا در بارگذاری گروه‌های ارسالی'
      );
      logger.error('Error loading groups:',  err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleViewGroup = (groupId: string) => {
    navigate({ to: '/admin-review/$groupId', params: { groupId } });
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="بررسی گروه‌های ارسالی" breadcrumb={['بررسی گروه‌های ارسالی']} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="بررسی گروه‌های ارسالی" breadcrumb={['بررسی گروه‌های ارسالی']} />
        <Box sx={{ p: 3, bgcolor: '#fee', borderRadius: 2, mt: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader title="بررسی گروه‌های ارسالی" breadcrumb={['بررسی گروه‌های ارسالی']} />
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 4,
          py: 6,
          mt: 3,
        }}
      >
        <AdminReviewGroupsTable 
          data={groups} 
          onViewGroup={handleViewGroup}
          onStatusChange={loadGroups}
        />
      </Box>
    </>
  );
}

