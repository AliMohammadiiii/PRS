import { createFileRoute } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Grid, TextField } from 'injast-core/components';
import { SearchNormal1 } from 'iconsax-reactjs';
import { defaultColors } from 'injast-core/constants';
import { z } from 'zod';
import PageHeader from '../../components/PageHeader';
import BasicInfoSection from './components/BasicInfoSection';
import {
  BasicInfoItem,
  BasicInfoCategory,
  BASIC_INFO_CATEGORIES,
} from 'src/types/basicInfo';
import * as lookupApi from 'src/services/api/lookups';
import * as lookupTypeApi from 'src/services/api/lookups';
import * as periodApi from 'src/services/api/periods';
import { Lookup } from 'src/types/api/lookups';
import { LookupType } from 'src/types/api/lookups';
import { FinancialPeriod } from 'src/types/api/periods';
import { INITIAL_LIMIT } from 'src/shared/constants';
import { updateSearchParams } from 'src/shared/utils/updateSearchParams';
import { useAuth } from 'src/client/contexts/AuthContext';

const pageSearchSchema = z.object({
  page: z.number().catch(1),
  limit: z.number().catch(INITIAL_LIMIT),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/basic-info/')({
  component: BasicInfoPage,
  validateSearch: (search) => pageSearchSchema.parse(search),
});

// Map frontend category to backend lookup type code
const CATEGORY_TO_TYPE_CODE: Record<BasicInfoCategory, string> = {
  'position-in-company': 'COMPANY_ROLE',
  'financial-period': 'FINANCIAL_PERIOD',
  'report-period': 'REPORTING_PERIOD',
  'legal-entity-type': 'LEGAL_ENTITY_TYPE',
  'report-status': 'REPORT_STATUS',
  industry: 'INDUSTRY_TYPE',
  'sub-industry': 'SUB_INDUSTRY_TYPE',
};

// Helper function to map backend Lookup to frontend BasicInfoItem
function mapLookupToBasicInfoItem(lookup: Lookup, category: BasicInfoCategory): BasicInfoItem {
  return {
    id: lookup.id,
    title: lookup.title,
    code: lookup.code,
    status: lookup.is_active ? 'active' : 'inactive',
    category,
  };
}

// Helper function to map backend FinancialPeriod to frontend BasicInfoItem
function mapFinancialPeriodToBasicInfoItem(period: FinancialPeriod): BasicInfoItem {
  return {
    id: period.id,
    title: period.title,
    code: period.id.substring(0, 8), // Use first 8 chars of UUID as code
    status: period.is_active ? 'active' : 'inactive',
    category: 'financial-period',
  };
}

function BasicInfoPage() {
  const { search: searchParam } = Route.useSearch();
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  const [searchValue, setSearchValue] = useState(searchParam || '');
  // Initialize state for all categories
  const [categoryItems, setCategoryItems] = useState<
    Record<BasicInfoCategory, BasicInfoItem[]>
  >(() => {
    const initial: Record<BasicInfoCategory, BasicInfoItem[]> = {
      'position-in-company': [],
      'financial-period': [],
      'report-period': [],
      'legal-entity-type': [],
      'report-status': [],
      industry: [],
      'sub-industry': [],
    };
    return initial;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    updateSearchParams({ search: value || undefined, page: 1 });
  };

  // Load from API on mount
  useEffect(() => {
    const loadBasicInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [lookups, lookupTypes, financialPeriods] = await Promise.all([
          lookupApi.getLookups(),
          lookupTypeApi.getLookupTypes(),
          periodApi.getFinancialPeriods().catch(() => []), // Load financial periods separately
        ]);

        // Group lookups by type code
        const lookupsByType = new Map<string, Lookup[]>();
        lookups.forEach((lookup) => {
          const typeCode = lookup.type;
          if (!lookupsByType.has(typeCode)) {
            lookupsByType.set(typeCode, []);
          }
          lookupsByType.get(typeCode)!.push(lookup);
        });

        // Map to frontend format
        const mapped: Record<BasicInfoCategory, BasicInfoItem[]> = {
          'position-in-company': [],
          'financial-period': [],
          'report-period': [],
          'legal-entity-type': [],
          'report-status': [],
          industry: [],
          'sub-industry': [],
        };

        // Map financial periods separately (they come from a different API)
        mapped['financial-period'] = financialPeriods.map(mapFinancialPeriodToBasicInfoItem);

        // Map other categories from lookups
        Object.entries(CATEGORY_TO_TYPE_CODE).forEach(([category, typeCode]) => {
          // Skip financial-period as it's already mapped above
          if (category === 'financial-period') return;
          
          const categoryLookups = lookupsByType.get(typeCode) || [];
          mapped[category as BasicInfoCategory] = categoryLookups.map((lookup) =>
            mapLookupToBasicInfoItem(lookup, category as BasicInfoCategory)
          );
        });

        setCategoryItems(mapped);
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
          err.message ||
          'خطا در بارگذاری اطلاعات پایه'
        );
        logger.error('Error loading basic info:',  err);
      } finally {
        setIsLoading(false);
      }
    };
    loadBasicInfo();
  }, []);

  const handleItemsChange = async (category: BasicInfoCategory, items: BasicInfoItem[]) => {
    // Update local state optimistically
    setCategoryItems((prev) => ({
      ...prev,
      [category]: items,
    }));

    // Sync with backend
    try {
      // Handle financial periods separately (they use a different API)
      if (category === 'financial-period') {
        const currentPeriods = await periodApi.getFinancialPeriods();
        const itemsMap = new Map(items.map((item) => [item.id, item]));
        const periodsMap = new Map(currentPeriods.map((p) => [p.id, p]));

        // Update existing or create new
        for (const item of items) {
          if (periodsMap.has(item.id)) {
            const period = periodsMap.get(item.id)!;
            if (
              period.title !== item.title ||
              period.is_active !== (item.status === 'active')
            ) {
              await periodApi.updateFinancialPeriod(item.id, {
                title: item.title,
                is_active: item.status === 'active',
              });
            }
          } else {
            // Create new financial period
            // For new items, we need to generate dates - use current year as default
            const now = new Date();
            const year = now.getFullYear();
            await periodApi.createFinancialPeriod({
              title: item.title,
              start_date: `${year}-01-01`,
              end_date: `${year}-12-31`,
              is_active: item.status === 'active',
            });
          }
        }

        // Soft delete removed items
        for (const period of currentPeriods) {
          if (!itemsMap.has(period.id)) {
            await periodApi.deleteFinancialPeriod(period.id);
          }
        }
      } else {
        // Handle other categories as lookups
        const typeCode = CATEGORY_TO_TYPE_CODE[category];
        const currentLookups = await lookupApi.getLookups();
        const categoryLookups = currentLookups.filter((l) => l.type === typeCode);

        // Find items to create, update, or delete
        const itemsMap = new Map(items.map((item) => [item.id, item]));
        const lookupsMap = new Map(categoryLookups.map((l) => [l.id, l]));

        // Update existing
        for (const item of items) {
          if (lookupsMap.has(item.id)) {
            const lookup = lookupsMap.get(item)!;
            if (
              lookup.title !== item.title ||
              lookup.code !== item.code ||
              lookup.is_active !== (item.status === 'active')
            ) {
              await lookupApi.updateLookup(item.id, {
                title: item.title,
                code: item.code,
                is_active: item.status === 'active',
              });
            }
          } else {
            // Create new
            await lookupApi.createLookup({
              type: typeCode,
              code: item.code,
              title: item.title,
              is_active: item.status === 'active',
            });
          }
        }

        // Delete removed items
        for (const lookup of categoryLookups) {
          if (!itemsMap.has(lookup.id)) {
            await lookupApi.deleteLookup(lookup.id);
          }
        }
      }
    } catch (err: any) {
      // Reload from API on error to revert changes
      try {
        const [lookups, lookupTypes, financialPeriods] = await Promise.all([
          lookupApi.getLookups(),
          lookupTypeApi.getLookupTypes(),
          periodApi.getFinancialPeriods().catch(() => []),
        ]);

        const lookupsByType = new Map<string, Lookup[]>();
        lookups.forEach((lookup) => {
          const typeCode = lookup.type;
          if (!lookupsByType.has(typeCode)) {
            lookupsByType.set(typeCode, []);
          }
          lookupsByType.get(typeCode)!.push(lookup);
        });

        const mapped: Record<BasicInfoCategory, BasicInfoItem[]> = {
          'position-in-company': [],
          'financial-period': [],
          'report-period': [],
          'legal-entity-type': [],
          'report-status': [],
          industry: [],
          'sub-industry': [],
        };

        // Map financial periods separately
        mapped['financial-period'] = financialPeriods.map(mapFinancialPeriodToBasicInfoItem);

        // Map other categories from lookups
        Object.entries(CATEGORY_TO_TYPE_CODE).forEach(([category, typeCode]) => {
          if (category === 'financial-period') return;
          
          const categoryLookups = lookupsByType.get(typeCode) || [];
          mapped[category as BasicInfoCategory] = categoryLookups.map((lookup) =>
            mapLookupToBasicInfoItem(lookup, category as BasicInfoCategory)
          );
        });

        setCategoryItems(mapped);
      } catch (reloadErr) {
        logger.error('Error reloading data:',  reloadErr);
      }
      throw new Error(
        err.response?.data?.detail ||
        err.message ||
        'خطا در ذخیره اطلاعات'
      );
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="تعریف اطلاعات پایه" breadcrumb={['تعریف اطلاعات پایه']} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="تعریف اطلاعات پایه" breadcrumb={['تعریف اطلاعات پایه']} />
        <Box sx={{ p: 3, bgcolor: '#fee', borderRadius: 2, mt: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader title="تعریف اطلاعات پایه" breadcrumb={['تعریف اطلاعات پایه']} />
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
              placeholder="جستجوی اطلاعات پایه"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
            />
          </Grid>
        </Grid>
        <Box
          sx={{
            overflowY: 'auto',
            overflowX: 'hidden',
            maxHeight: 'calc(100vh - 400px)',
            pb: 0,
            '& > div:not(:last-child)': {
              borderBottom: '1px solid #e5e7ea',
            },
          }}
        >
        {BASIC_INFO_CATEGORIES.map((categoryConfig) => (
          <BasicInfoSection
            key={categoryConfig.key}
            category={categoryConfig.key}
            title={categoryConfig.title}
            fourthColumnTitle={categoryConfig.fourthColumnTitle}
            items={categoryItems[categoryConfig.key]}
            onItemsChange={handleItemsChange}
            isEditable={isAdmin}
          />
        ))}
        </Box>
      </Box>
    </>
  );
}

