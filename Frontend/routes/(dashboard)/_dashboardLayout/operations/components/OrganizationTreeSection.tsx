import { FC, useMemo } from 'react';
import { Box, Button, Typography } from 'injast-core/components';
import { Organization } from 'src/types/operations';
import { OrganizationTreeItem as OrganizationTreeItemType } from 'src/types/operations';
import { OrganizationTree } from './OrganizationTree';
import OrganizationTreeEmptyState from './OrganizationTreeEmptyState';

type OrganizationTreeSectionProps = {
  organizations: Organization[];
  selectedOrganizationId: string | null;
  onSelectOrganization: (id: string | null) => void;
  onAddOrganization: () => void;
  onDeleteOrganization: (id: string) => void;
};

const OrganizationTreeSection: FC<OrganizationTreeSectionProps> = ({
  organizations,
  selectedOrganizationId,
  onSelectOrganization,
  onAddOrganization,
  onDeleteOrganization,
}) => {
  // Convert organizations to tree structure
  const treeData = useMemo<OrganizationTreeItemType[]>(() => {
    if (organizations.length === 0) return [];

    // Build a map of organizations by ID
    const orgMap = new Map<string, Organization>();
    organizations.forEach((org) => orgMap.set(org.id, org));

    // Build tree structure
    const buildTree = (parentId: string | undefined | null, level: number = 0): OrganizationTreeItemType[] => {
      return organizations
        .filter((org) => {
          // Handle root level organizations (no parent)
          if (parentId === undefined || parentId === null) {
            return !org.parentId || org.parentId === null || org.parentId === '' || org.parentId === undefined;
          }
          // Handle child organizations (matching parent ID)
          return org.parentId === parentId;
        })
        .map((org) => {
          const children = buildTree(org.id, level + 1);
          return {
            id: org.id,
            name: org.name,
            level: level,
            isExpanded: children.length > 0,
            children: children.length > 0 ? children : undefined,
            organizationId: org.id,
          };
        });
    };

    return buildTree(undefined);
  }, [organizations]);

  const handleItemClick = (id: string) => {
    onSelectOrganization(id);
  };

  if (organizations.length === 0) {
    return (
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 4,
          py: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 40,
          }}
        >
          <Typography
            sx={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'neutral.secondary',
            }}
          >
            نمودار درختی سازمان
          </Typography>
          <Button
            onClick={onAddOrganization}
            variant="contained"
            color="primary"
            buttonSize="S"
            sx={{ borderRadius: 1 }}
          >
            افزودن سازمان
          </Button>
        </Box>
        <OrganizationTreeEmptyState />
      </Box>
    );
  }

  return (
    <OrganizationTree
      data={treeData}
      selectedId={selectedOrganizationId || undefined}
      onItemClick={handleItemClick}
      onAddOrganization={onAddOrganization}
      onDeleteOrganization={onDeleteOrganization}
    />
  );
};

export default OrganizationTreeSection;

