import { createFileRoute } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Grid, TextField } from 'injast-core/components';
import { SearchNormal1 } from 'iconsax-reactjs';
import { defaultColors } from 'injast-core/constants';
import { z } from 'zod';
import PageHeader from '../../components/PageHeader';
import ReportTitlesSection from './components/ReportTitlesSection';
import { ReportTitleItem, ReportField } from 'src/types/reportTitles';
import * as reportBoxApi from 'src/services/api/reports';
import { ReportBox, ReportField as ApiReportField } from 'src/types/api/reports';
import { INITIAL_LIMIT } from 'src/shared/constants';
import { updateSearchParams } from 'src/shared/utils/updateSearchParams';

const pageSearchSchema = z.object({
  page: z.number().catch(1),
  limit: z.number().catch(INITIAL_LIMIT),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute(
  '/(dashboard)/_dashboardLayout/report-titles/'
)({
  component: ReportTitlesPage,
  validateSearch: (search) => pageSearchSchema.parse(search),
});

// Helper function to map backend ReportField to frontend ReportField
function mapApiFieldToField(apiField: ApiReportField): ReportField {
  return {
    id: apiField.id,
    title: apiField.name,
    type: apiField.data_type as any,
    label: apiField.name,
    defaultText: undefined,
    code: apiField.field_id,
    isActive: apiField.is_active,
    options: undefined,
    fileExtension: undefined,
  };
}

// Helper function to map backend ReportBox to frontend ReportTitleItem
function mapReportBoxToReportTitle(reportBox: ReportBox): ReportTitleItem {
  return {
    id: reportBox.id,
    title: reportBox.name,
    code: reportBox.code,
    groups: reportBox.groups || [],
    fields: (reportBox.fields || []).map(mapApiFieldToField),
    status: reportBox.is_active ? 'active' : 'inactive',
    description: reportBox.description || undefined,
  };
}

function ReportTitlesPage() {
  const { search: searchParam } = Route.useSearch();
  const [searchValue, setSearchValue] = useState(searchParam || '');
  const [reportTitles, setReportTitles] = useState<ReportTitleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    updateSearchParams({ search: value || undefined, page: 1 });
  };

  // Load from API on mount
  useEffect(() => {
    const loadReportTitles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const reportBoxes = await reportBoxApi.getReportBoxes();
        const mapped = reportBoxes.map(mapReportBoxToReportTitle);
        setReportTitles(mapped);
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
          err.message ||
          'خطا در بارگذاری عناوین گزارشات'
        );
        logger.error('Error loading report titles:',  err);
      } finally {
        setIsLoading(false);
      }
    };
    loadReportTitles();
  }, []);

  const handleItemsChange = async (items: ReportTitleItem[]) => {
    // Update local state optimistically
    setReportTitles(items);

    // Sync with backend
    try {
      const currentBoxes = await reportBoxApi.getReportBoxes();
      const itemsMap = new Map(items.map((item) => [item.id, item]));
      const boxesMap = new Map(currentBoxes.map((b) => [b.id, b]));

      // Update existing
      for (const item of items) {
        if (boxesMap.has(item.id)) {
          const box = boxesMap.get(item)!;
          if (
            box.name !== item.title ||
            box.code !== item.code ||
            JSON.stringify(box.groups) !== JSON.stringify(item.groups) ||
            box.description !== (item.description || null) ||
            box.is_active !== (item.status === 'active')
          ) {
            await reportBoxApi.updateReportBox(item.id, {
              name: item.title,
              code: item.code,
              groups: item.groups,
              description: item.description || null,
              is_active: item.status === 'active',
            });
          }
        } else {
          // Create new
          await reportBoxApi.createReportBox({
            name: item.title,
            code: item.code,
            groups: item.groups,
            description: item.description || null,
            is_active: item.status === 'active',
          });
        }
      }

      // Delete removed items
      for (const box of currentBoxes) {
        if (!itemsMap.has(box.id)) {
          await reportBoxApi.deleteReportBox(box.id);
        }
      }
    } catch (err: any) {
      // Reload from API on error to revert changes
      try {
        const reportBoxes = await reportBoxApi.getReportBoxes();
        const mapped = reportBoxes.map(mapReportBoxToReportTitle);
        setReportTitles(mapped);
      } catch (reloadErr) {
        logger.error('Error reloading data:',  reloadErr);
      }
      throw new Error(
        err.response?.data?.detail ||
        err.message ||
        'خطا در ذخیره عناوین گزارشات'
      );
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="تعریف عناوین گزارشات"
          breadcrumb={['تعریف عناوین']}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="تعریف عناوین گزارشات"
          breadcrumb={['تعریف عناوین']}
        />
        <Box sx={{ p: 3, bgcolor: '#fee', borderRadius: 2, mt: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="تعریف عناوین گزارشات"
        breadcrumb={['تعریف عناوین']}
      />
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
              placeholder="جستجوی عناوین گزارشات"
            />
          </Grid>
        </Grid>
        <ReportTitlesSection
          items={reportTitles}
          onItemsChange={handleItemsChange}
        />
      </Box>
    </>
  );
}

