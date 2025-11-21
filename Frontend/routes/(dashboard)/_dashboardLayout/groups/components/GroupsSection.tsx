import { useState, FC } from 'react';
import { Box, Grid, Typography, Button } from 'injast-core/components';
import { Plus } from 'lucide-react';
import { Group, generatePersianCode } from 'src/types/groups';
import { GroupsTable } from './GroupsTable';
import { AddGroupModal, GroupFormData } from './AddGroupModal';

type GroupsSectionProps = {
  items: Group[];
  onItemsChange: (items: Group[]) => void;
};

const GroupsSection: FC<GroupsSectionProps> = ({ items, onItemsChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (formData: GroupFormData) => {
    if (editingId) {
      // Edit existing group
      const updatedItems = items.map((item) =>
        item.id === editingId
          ? {
              ...item,
              title: formData.title,
              description: formData.description,
              status: formData.isActive ? 'active' : 'inactive',
            }
          : item
      );
      onItemsChange(updatedItems);
    } else {
      // Add new group
      const newItem: Group = {
        id: `group-${Date.now()}-${Math.random()}`,
        title: formData.title,
        code: generatePersianCode(),
        description: formData.description,
        status: formData.isActive ? 'active' : 'inactive',
      };
      onItemsChange([...items, newItem]);
    }
    setIsModalOpen(false);
    setEditingId(null);
  };

  const editingItem = editingId ? items.find((item) => item.id === editingId) : null;

  const initialFormData: GroupFormData | null = editingItem
    ? {
        title: editingItem.title,
        description: editingItem.description,
        isActive: editingItem.status === 'active',
      }
    : null;

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: 2,
        px: 4,
        py: 4,
        mb: 3,
      }}
    >
      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Grid size="auto">
          <Typography
            variant="h6"
            sx={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'neutral.dark',
            }}
          >
            گروه های تعریف شده
          </Typography>
        </Grid>
        <Grid size="auto">
          <Button
            onClick={handleAdd}
            variant="contained"
            color="primary"
            buttonSize="M"
            startIcon={<Plus className="w-5 h-5" />}
            sx={{ borderRadius: 1 }}
          >
            افزودن
          </Button>
        </Grid>
      </Grid>

      <GroupsTable data={items} onEdit={handleEdit} />

      <AddGroupModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleModalSubmit}
        initialData={initialFormData}
      />
    </Box>
  );
};

export default GroupsSection;

