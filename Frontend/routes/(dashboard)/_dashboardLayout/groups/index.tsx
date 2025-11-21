import { createFileRoute } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Grid, TextField } from 'injast-core/components';
import { SearchNormal1 } from 'iconsax-reactjs';
import { defaultColors } from 'injast-core/constants';
import { z } from 'zod';
import PageHeader from '../../components/PageHeader';
import GroupsSection from './components/GroupsSection';
import { Group } from 'src/types/groups';
import * as reportGroupApi from 'src/services/api/reports';
import { ReportGroup } from 'src/types/api/reports';
import { INITIAL_LIMIT } from 'src/shared/constants';
import { updateSearchParams } from 'src/shared/utils/updateSearchParams';

const pageSearchSchema = z.object({
  page: z.number().catch(1),
  limit: z.number().catch(INITIAL_LIMIT),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/groups/')({
  component: GroupsPage,
  validateSearch: (search) => pageSearchSchema.parse(search),
});

// Helper function to map backend ReportGroup to frontend Group
function mapReportGroupToGroup(reportGroup: ReportGroup): Group {
  return {
    id: reportGroup.id,
    title: reportGroup.name,
    code: reportGroup.id, // Use ID as code if no code field
    description: reportGroup.description || '',
    status: reportGroup.is_active ? 'active' : 'inactive',
  };
}

function GroupsPage() {
  const { search: searchParam } = Route.useSearch();
  const [searchValue, setSearchValue] = useState(searchParam || '');
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    updateSearchParams({ search: value || undefined, page: 1 });
  };

  // Load from API on mount
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const reportGroups = await reportGroupApi.getReportGroups();
        const mapped = reportGroups.map(mapReportGroupToGroup);
        setGroups(mapped);
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
          err.message ||
          'خطا در بارگذاری گروه‌ها'
        );
        logger.error('Error loading groups:',  err);
      } finally {
        setIsLoading(false);
      }
    };
    loadGroups();
  }, []);

  const handleItemsChange = async (items: Group[]) => {
    // Update local state optimistically
    setGroups(items);

    // Sync with backend
    try {
      const currentGroups = await reportGroupApi.getReportGroups();
      const itemsMap = new Map(items.map((item) => [item.id, item]));
      const groupsMap = new Map(currentGroups.map((g) => [g.id, g]));

      // Update existing
      for (const item of items) {
        if (groupsMap.has(item.id)) {
          const group = groupsMap.get(item)!;
          if (
            group.name !== item.title ||
            group.description !== item.description ||
            group.is_active !== (item.status === 'active')
          ) {
            await reportGroupApi.updateReportGroup(item.id, {
              name: item.title,
              description: item.description,
              is_active: item.status === 'active',
            });
          }
        } else {
          // Create new
          await reportGroupApi.createReportGroup({
            name: item.title,
            description: item.description,
            is_active: item.status === 'active',
          });
        }
      }

      // Delete removed items
      for (const group of currentGroups) {
        if (!itemsMap.has(group.id)) {
          await reportGroupApi.deleteReportGroup(group.id);
        }
      }
    } catch (err: any) {
      // Reload from API on error to revert changes
      try {
        const reportGroups = await reportGroupApi.getReportGroups();
        const mapped = reportGroups.map(mapReportGroupToGroup);
        setGroups(mapped);
      } catch (reloadErr) {
        logger.error('Error reloading data:',  reloadErr);
      }
      throw new Error(
        err.response?.data?.detail ||
        err.message ||
        'خطا در ذخیره گروه‌ها'
      );
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="تعریف گروه" breadcrumb={['تعریف گروه']} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="تعریف گروه" breadcrumb={['تعریف گروه']} />
        <Box sx={{ p: 3, bgcolor: '#fee', borderRadius: 2, mt: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader title="تعریف گروه" breadcrumb={['تعریف گروه']} />
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
              height={40}
              fullWidth
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              startAdornment={
                <SearchNormal1
                  size={20}
                  color={defaultColors.neutral.light}
                />
              }
              placeholder="جستجوی گروه‌ها"
            />
          </Grid>
        </Grid>
        <GroupsSection items={groups} onItemsChange={handleItemsChange} />
      </Box>
    </>
  );
}

