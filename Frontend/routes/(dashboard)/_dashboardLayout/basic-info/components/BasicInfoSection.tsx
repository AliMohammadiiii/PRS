import { useState, FC } from 'react';
import { Box, Grid, Typography, Button } from 'injast-core/components';
import { Plus } from 'lucide-react';
import { BasicInfoItem, BasicInfoCategory, generatePersianCode } from 'src/types/basicInfo';
import { BasicInfoTable } from './BasicInfoTable';
import { AddBasicInfoModal, BasicInfoFormData } from './AddBasicInfoModal';

type BasicInfoSectionProps = {
  category: BasicInfoCategory;
  title: string;
  fourthColumnTitle: string;
  items: BasicInfoItem[];
  onItemsChange: (category: BasicInfoCategory, items: BasicInfoItem[]) => void;
  isEditable?: boolean;
};

const BasicInfoSection: FC<BasicInfoSectionProps> = ({
  category,
  title,
  fourthColumnTitle,
  items,
  onItemsChange,
  isEditable = true,
}) => {
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

  const handleModalSubmit = (formData: BasicInfoFormData) => {
    if (editingId) {
      // Edit existing item
      const updatedItems = items.map((item) =>
        item.id === editingId
          ? {
              ...item,
              title: formData.title,
              status: formData.isActive ? 'active' : 'inactive',
            }
          : item
      );
      onItemsChange(category, updatedItems);
    } else {
      // Add new item
      const newItem: BasicInfoItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        title: formData.title,
        code: generatePersianCode(),
        status: formData.isActive ? 'active' : 'inactive',
        category,
      };
      onItemsChange(category, [...items, newItem]);
    }
    setIsModalOpen(false);
    setEditingId(null);
  };

  const editingItem = editingId ? items.find((item) => item.id === editingId) : null;

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: 2,
        px: 4,
        py: 2,
        mb: 0,
      }}
    >
      <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Grid size="auto">
          <Typography
            variant="h6"
            sx={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'neutral.dark',
            }}
          >
            {title}
          </Typography>
        </Grid>
        {isEditable && (
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
        )}
      </Grid>

      <BasicInfoTable
        data={items}
        onEdit={isEditable ? handleEdit : undefined}
        fourthColumnTitle={fourthColumnTitle}
        category={category}
      />

      <AddBasicInfoModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleModalSubmit}
        initialData={editingItem || null}
        categoryTitle={title}
      />
    </Box>
  );
};

export default BasicInfoSection;

