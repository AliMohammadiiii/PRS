import { FC, useRef } from 'react';
import { Box } from 'injast-core/components';
import { Organization } from 'src/types/operations';
import OrganizationInfoForm from './OrganizationInfoForm';
import OrganizationTreeSection from './OrganizationTreeSection';

type OrganizationSectionProps = {
  organizations: Organization[];
  selectedOrganizationId: string | null;
  onSelectOrganization: (id: string | null) => void;
  onUpdateOrganization: (org: Organization) => void;
  onAddOrganization: (org: Organization) => void;
  onDeleteOrganization: (id: string) => void;
};

const OrganizationSection: FC<OrganizationSectionProps> = ({
  organizations,
  selectedOrganizationId,
  onSelectOrganization,
  onUpdateOrganization,
  onAddOrganization,
  onDeleteOrganization,
}) => {
  const selectedOrganization = selectedOrganizationId
    ? organizations.find((o) => o.id === selectedOrganizationId)
    : null;

  const startAddingRef = useRef<(() => void) | null>(null);

  const handleAddClick = () => {
    // If there are no organizations, trigger start adding mode first
    if (organizations.length === 0 && startAddingRef.current) {
      startAddingRef.current();
    }
    // Clear selection to show empty form for adding new organization
    onSelectOrganization(null);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        width: '100%',
      }}
    >
      <Box sx={{ flex: '1 1 auto' }}>
        <OrganizationTreeSection
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          onSelectOrganization={onSelectOrganization}
          onAddOrganization={handleAddClick}
          onDeleteOrganization={onDeleteOrganization}
        />
      </Box>
      <Box sx={{ flex: '0 0 480px' }}>
        <OrganizationInfoForm
          organizations={organizations}
          selectedOrganization={selectedOrganization}
          onSelectOrganization={onSelectOrganization}
          onSave={onUpdateOrganization}
          onAdd={onAddOrganization}
          onStartAdding={(fn) => {
            startAddingRef.current = fn;
          }}
        />
      </Box>
    </Box>
  );
};

export default OrganizationSection;

