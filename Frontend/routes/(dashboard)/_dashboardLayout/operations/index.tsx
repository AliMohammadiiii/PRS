import { createFileRoute } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Grid, TextField } from 'injast-core/components';
import { SearchNormal1 } from 'iconsax-reactjs';
import { defaultColors } from 'injast-core/constants';
import { z } from 'zod';
import PageHeader from '../../components/PageHeader';
import OperationsTabs from './components/OperationsTabs';
import OrganizationSection from './components/OrganizationSection';
import UsersSection from './components/UsersSection';
import { Organization } from 'src/types/operations';
import { BasicInfoItem } from 'src/types/basicInfo';
import * as orgApi from 'src/services/api/organizations';
import * as prsApi from 'src/services/api/prs';
import * as lookupApi from 'src/services/api/lookups';
import { OrgNode } from 'src/types/api/organizations';
import { Lookup } from 'src/types/api/lookups';
import { Team } from 'src/types/api/prs';
import { INITIAL_LIMIT } from 'src/shared/constants';
import { updateSearchParams } from 'src/shared/utils/updateSearchParams';
import { useAuth } from 'src/client/contexts/AuthContext';

const pageSearchSchema = z.object({
  active_tab: z.enum(['organization', 'users']).catch('users'),
  page: z.number().catch(1),
  limit: z.number().catch(INITIAL_LIMIT),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/operations/')({
  component: OperationsPage,
  validateSearch: (search) => pageSearchSchema.parse(search),
});

// Helper function to map backend OrgNode to frontend Organization
function mapOrgNodeToOrganization(orgNode: OrgNode): Organization {
  // Handle parent - it can be either a nested object or just an ID string
  let parentId: string | undefined = undefined;
  if (orgNode.parent) {
    // If parent is an object, get its id
    if (typeof orgNode.parent === 'object' && 'id' in orgNode.parent) {
      parentId = orgNode.parent.id;
    } 
    // If parent is just a string (UUID), use it directly
    else if (typeof orgNode.parent === 'string') {
      parentId = orgNode.parent;
    }
  }
  // Also check parent_id field (write-only field that might be present)
  if (!parentId && orgNode.parent_id) {
    parentId = orgNode.parent_id;
  }
  
  return {
    id: orgNode.id,
    name: orgNode.name,
    type: orgNode.node_type, // Already in correct format (HOLDING or COMPANY)
    registrationNumber: orgNode.registration_number || '',
    companyClassifications: orgNode.company_classifications?.map(cc => cc.id) || [],
    legalEntityTypeId: orgNode.legal_entity_type?.id || undefined,
    nationalId: orgNode.national_id || '',
    economicCode: orgNode.economic_code || '',
    registrationDate: orgNode.incorporation_date || '',
    subIndustryId: orgNode.sub_industry?.id || undefined,
    industryId: orgNode.industry?.id || undefined,
    websiteUrl: orgNode.website_url || '',
    parentHolding: '', // Will be populated in loadOrganizations after all orgs are loaded
    isActive: orgNode.is_active,
    parentId: parentId,
    createdAt: orgNode.created_at,
    updatedAt: orgNode.updated_at,
  };
}

// Helper function to map backend Lookup to frontend BasicInfoItem
function mapLookupToBasicInfoItem(lookup: Lookup, category: string): BasicInfoItem {
  return {
    id: lookup.id,
    title: lookup.title,
    code: lookup.code,
    status: lookup.is_active ? 'active' : 'inactive',
    category: category as any,
  };
}

function OperationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  const { active_tab: activeTab, search: searchParam } = Route.useSearch();
  const [searchValue, setSearchValue] = useState(searchParam || '');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [roles, setRoles] = useState<BasicInfoItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    updateSearchParams({ search: value || undefined, page: 1 });
  };

  // Load organizations from API
  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const orgNodes = await orgApi.getOrgNodes();
      
      // First pass: map all organizations
      const mapped = orgNodes.map(mapOrgNodeToOrganization);
      
      // Second pass: resolve parent names by looking up parent IDs
      const orgMap = new Map(mapped.map(org => [org.id, org]));
      const mappedWithParents = mapped.map(org => {
        if (org.parentId) {
          const parent = orgMap.get(org.parentId);
          if (parent) {
            return {
              ...org,
              parentHolding: parent.name,
            };
          }
        }
        return org;
      });
      
      setOrganizations(mappedWithParents);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'خطا در بارگذاری سازمان‌ها'
      );
      logger.error('Error loading organizations:',  err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadOrganizations();
    }
  }, [isAdmin]);

  // Load teams for PRS user management
  useEffect(() => {
    if (!isAdmin) return;
    const loadTeams = async () => {
      try {
        const data = await prsApi.getTeams();
        setTeams(data.filter((t) => t.is_active));
      } catch (err: any) {
        logger.error('Error loading teams:', err);
      }
    };
    loadTeams();
  }, [isAdmin]);

  // Load roles (position-in-company) from API
  useEffect(() => {
    if (!isAdmin) return;
    const loadRoles = async () => {
      try {
        const lookups = await lookupApi.getLookups();
        // Filter for company roles (type code is 'COMPANY_ROLE')
        const positionLookups = lookups.filter(
          (l) => l.type === 'COMPANY_ROLE'
        );
        const mapped = positionLookups
          .filter((l) => l.is_active)
          .map((l) => mapLookupToBasicInfoItem(l, 'position-in-company'));
        setRoles(mapped);
      } catch (err: any) {
        logger.error('Error loading roles:',  err);
      }
    };
    loadRoles();
  }, [isAdmin]);

  // Refresh roles when switching to users tab
  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
      const loadRoles = async () => {
        try {
          const lookups = await lookupApi.getLookups();
          // Filter for company roles (type code is 'COMPANY_ROLE')
          const positionLookups = lookups.filter(
            (l) => l.type === 'COMPANY_ROLE'
          );
          const mapped = positionLookups
            .filter((l) => l.is_active)
            .map((l) => mapLookupToBasicInfoItem(l, 'position-in-company'));
          setRoles(mapped);
        } catch (err: any) {
          logger.error('Error loading roles:',  err);
        }
      };
      loadRoles();
    }
  }, [activeTab]);

  const handleOrganizationAdd = async (org: Organization) => {
    try {
      // Map frontend Organization to backend OrgNodeCreateRequest
      const createData: any = {
        name: org.name,
        code: org.registrationNumber || `ORG-${Date.now()}`,
        node_type: org.type as 'COMPANY' | 'HOLDING',
        registration_number: org.registrationNumber || null,
        national_id: org.nationalId || null,
        economic_code: org.economicCode || null,
        incorporation_date: org.registrationDate || null,
        website_url: org.websiteUrl || null,
        legal_entity_type_id: org.legalEntityTypeId || null,
        industry_id: org.industryId || null,
        sub_industry_id: org.subIndustryId || null,
        company_classification_ids: org.companyClassifications || [],
        is_active: org.isActive,
      };
      
      // Only include parent_id if it's provided (not empty string or undefined)
      if (org.parentId) {
        createData.parent_id = org.parentId;
      } else {
        createData.parent_id = null;
      }
      
      const created = await orgApi.createOrgNode(createData);
      // Reload all organizations to ensure tree structure is correct
      await loadOrganizations();
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail ||
        err.message ||
        'خطا در ایجاد سازمان'
      );
    }
  };

  const handleOrganizationUpdate = async (org: Organization) => {
    try {
      const updateData: any = {
        name: org.name,
        code: org.registrationNumber || undefined,
        registration_number: org.registrationNumber || null,
        national_id: org.nationalId || null,
        economic_code: org.economicCode || null,
        incorporation_date: org.registrationDate || null,
        website_url: org.websiteUrl || null,
        legal_entity_type_id: org.legalEntityTypeId || null,
        industry_id: org.industryId || null,
        sub_industry_id: org.subIndustryId || null,
        company_classification_ids: org.companyClassifications || [],
        is_active: org.isActive,
      };
      
      // Always include parent_id (null if not provided)
      updateData.parent_id = org.parentId || null;
      
      await orgApi.updateOrgNode(org.id, updateData);
      // Reload all organizations to ensure tree structure is correct
      await loadOrganizations();
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail ||
        err.message ||
        'خطا در به‌روزرسانی سازمان'
      );
    }
  };

  const handleOrganizationDelete = async (id: string) => {
    try {
      // Recursively find all child organization IDs
      const findChildIds = (parentId: string, orgs: Organization[]): string[] => {
        const children = orgs.filter((o) => o.parentId === parentId);
        const childIds = children.map((c) => c.id);
        // Recursively find grandchildren
        const grandChildIds = childIds.flatMap((childId) => findChildIds(childId, orgs));
        return [...childIds, ...grandChildIds];
      };

      const childIds = findChildIds(id, organizations);
      const idsToDelete = [id, ...childIds];

      // Delete all child organizations first
      for (const childId of childIds) {
        await orgApi.deleteOrgNode(childId);
      }
      // Delete the parent organization
      await orgApi.deleteOrgNode(id);

      // Reload all organizations to ensure tree structure is correct
      await loadOrganizations();
      if (idsToDelete.includes(selectedOrganizationId || '')) {
        setSelectedOrganizationId(null);
      }
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail ||
        err.message ||
        'خطا در حذف سازمان'
      );
    }
  };

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="تعریف عملیاتی" breadcrumb={['تعریف عملیاتی']} />
        <Box sx={{ p: 3, bgcolor: '#fee', borderRadius: 2, mt: 3 }}>
          <Typography color="error">
            شما دسترسی لازم برای مشاهده این صفحه را ندارید.
          </Typography>
        </Box>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="تعریف عملیاتی" breadcrumb={['تعریف عملیاتی']} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="تعریف عملیاتی" breadcrumb={['تعریف عملیاتی']} />
        <Box sx={{ p: 3, bgcolor: '#fee', borderRadius: 2, mt: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader title="تعریف عملیاتی" breadcrumb={['تعریف عملیاتی']} />
      <Box
        sx={{
          mt: 3,
          overflowY: 'auto',
          overflowX: 'hidden',
          maxHeight: 'calc(100vh - 248px)',
          pb: 3,
        }}
      >
        <OperationsTabs activeTab={activeTab} />
        {activeTab === 'organization' && (
          <Box sx={{ mt: 3 }}>
            <OrganizationSection
              organizations={organizations}
              selectedOrganizationId={selectedOrganizationId}
              onSelectOrganization={setSelectedOrganizationId}
              onUpdateOrganization={handleOrganizationUpdate}
              onAddOrganization={handleOrganizationAdd}
              onDeleteOrganization={handleOrganizationDelete}
            />
          </Box>
        )}
        {activeTab === 'users' && (
          <>
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
                    placeholder="جستجوی کاربران"
                  />
                </Grid>
              </Grid>
            </Box>
            <UsersSection roles={roles} teams={teams} />
          </>
        )}
      </Box>
    </>
  );
}

