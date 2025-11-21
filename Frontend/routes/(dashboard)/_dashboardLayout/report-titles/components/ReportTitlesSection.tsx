import { useState, FC, useEffect } from 'react';
import logger from "@/lib/logger";
import { Box, Typography, Button } from 'injast-core/components';
import { Plus } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { ReportTitleItem, generatePersianCode } from 'src/types/reportTitles';
import { ReportTitlesTable } from './ReportTitlesTable';
import { AddReportTitleModal, ReportTitleFormData } from './AddReportTitleModal';
import { SelectOption } from '@/components/ui/multi-select-dropdown';
import * as reportGroupApi from 'src/services/api/reports';

type ReportTitlesSectionProps = {
  items: ReportTitleItem[];
  onItemsChange: (items: ReportTitleItem[]) => void;
};

const ReportTitlesSection: FC<ReportTitlesSectionProps> = ({
  items,
  onItemsChange,
}) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupOptions, setGroupOptions] = useState<SelectOption[]>([]);

  // Load groups from API for the dropdown
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groups = await reportGroupApi.getReportGroups();
        const options: SelectOption[] = groups
          .filter((g) => g.is_active)
          .map((group) => ({
            value: group.id,
            label: group.name,
          }));
        setGroupOptions(options);
      } catch (error) {
        logger.error('Error loading groups:',  error);
      }
    };

    loadGroups();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleDefineField = (id: string) => {
    // Navigate to define field page
    navigate({
      to: '/report-titles/$reportTitleId/define-field',
      params: { reportTitleId: id },
    });
  };

  const handleModalSubmit = (formData: ReportTitleFormData) => {
    if (editingId) {
      // Edit existing item
      const updatedItems = items.map((item) =>
        item.id === editingId
          ? {
              ...item,
              title: formData.title,
              groups: formData.groups,
              description: formData.description,
              status: formData.isActive ? 'active' : 'inactive',
            }
          : item
      );
      onItemsChange(updatedItems);
    } else {
      // Add new item
      const newItem: ReportTitleItem = {
        id: `report-title-${Date.now()}-${Math.random()}`,
        title: formData.title,
        code: generatePersianCode(),
        groups: formData.groups,
        fields: [], // Fields will be defined separately via define field page
        description: formData.description,
        status: formData.isActive ? 'active' : 'inactive',
      };
      onItemsChange([...items, newItem]);
    }
    setIsModalOpen(false);
    setEditingId(null);
  };

  const editingItem = editingId
    ? items.find((item) => item.id === editingId)
    : null;

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'neutral.dark',
          }}
        >
          عناوین تعریف شده
        </Typography>
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
      </Box>

      <ReportTitlesTable
        data={items}
        onEdit={handleEdit}
        onDefineField={handleDefineField}
      />

      <AddReportTitleModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleModalSubmit}
        initialData={editingItem || null}
        groupOptions={groupOptions}
      />
    </>
  );
};

export default ReportTitlesSection;

