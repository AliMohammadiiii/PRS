import * as React from 'react';
import { Box, Button, Typography } from 'injast-core/components';
import { OrganizationTreeItem } from './OrganizationTreeItem';
import { OrganizationTreeItem as OrganizationTreeItemType } from 'src/types/operations';

type OrganizationTreeProps = {
  data: OrganizationTreeItemType[];
  selectedId?: string;
  onItemClick?: (id: string) => void;
  onAddOrganization?: () => void;
  onDeleteOrganization?: (id: string) => void;
};

export function OrganizationTree({
  data,
  selectedId,
  onItemClick,
  onAddOrganization,
  onDeleteOrganization,
}: OrganizationTreeProps) {
  const [treeData, setTreeData] = React.useState<OrganizationTreeItemType[]>(data);

  React.useEffect(() => {
    setTreeData(data);
  }, [data]);

  const handleToggle = (id: string) => {
    const toggleNode = (
      nodes: OrganizationTreeItemType[]
    ): OrganizationTreeItemType[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setTreeData(toggleNode(treeData));
  };

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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {treeData.map((item) => (
          <OrganizationTreeItem
            key={item.id}
            data={item}
            selectedId={selectedId}
            onToggle={handleToggle}
            onClick={onItemClick}
            onDelete={onDeleteOrganization}
          />
        ))}
      </Box>
    </Box>
  );
}

