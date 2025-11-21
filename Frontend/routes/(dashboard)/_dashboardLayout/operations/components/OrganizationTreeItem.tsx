import * as React from 'react';
import { ChevronLeft, ChevronDown, Trash2 } from 'lucide-react';
import { Box, IconButton, Typography, Modal, Button } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { appColors } from 'src/theme/colors';
import { OrganizationTreeItem as OrganizationTreeItemType } from 'src/types/operations';

type OrganizationTreeItemProps = {
  data: OrganizationTreeItemType;
  selectedId?: string;
  onToggle?: (id: string) => void;
  onClick?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function OrganizationTreeItem({
  data,
  selectedId,
  onToggle,
  onClick,
  onDelete,
}: OrganizationTreeItemProps) {
  const isSelected = selectedId === data.id;
  const hasChildren = data.children && data.children.length > 0;
  const paddingLeft = data.level * 40;
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete?.(data.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Box
        onClick={() => onClick?.(data.id)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 48,
          px: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: isSelected
            ? appColors.primary.main
            : defaultColors.neutral[300],
          bgcolor: 'white',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: defaultColors.neutral[50],
          },
          ...(data.level > 0 && {
            width: `calc(100% - ${paddingLeft}px)`,
            marginLeft: `${paddingLeft}px`,
          }),
        }}
      >
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle?.(data.id);
          }}
          sx={{
            p: 0,
            minWidth: 20,
            width: 20,
            height: 20,
            '&:hover': {
              bgcolor: 'transparent',
            },
          }}
        >
          {hasChildren ? (
            data.isExpanded ? (
              <ChevronDown size={20} color={defaultColors.neutral.dark} />
            ) : (
              <ChevronLeft size={20} color={defaultColors.neutral.dark} />
            )
          ) : (
            <ChevronLeft size={20} color={defaultColors.neutral.dark} />
          )}
        </IconButton>
        <Typography
          sx={{
            flex: 1,
            fontSize: '16px',
            fontWeight: 700,
            color: 'neutral.secondary',
            textAlign: 'left',
          }}
        >
          {data.name}
        </Typography>
        {onDelete && (
          <IconButton
            onClick={handleDeleteClick}
            color="error"
            size="small"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              ml: 1,
            }}
            aria-label="حذف"
          >
            <Trash2 size={16} />
          </IconButton>
        )}
      </Box>

      <Modal open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography variant="h2" fontWeight={700}>
            حذف سازمان
          </Typography>
          <Typography color="neutral.light" sx={{ textAlign: 'center' }}>
            آیا از حذف سازمان "{data.name}" اطمینان دارید؟
            {hasChildren && (
              <Box component="span" sx={{ display: 'block', mt: 1, color: 'error.main' }}>
                توجه: تمام سازمان‌های زیرمجموعه نیز حذف خواهند شد.
              </Box>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <Button
              variant="outlined"
              onClick={() => setDeleteDialogOpen(false)}
              sx={{
                width: 130,
                color: defaultColors.neutral.main,
                borderColor: defaultColors.neutral[300],
              }}
            >
              انصراف
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              sx={{ width: 130 }}
            >
              حذف
            </Button>
          </Box>
        </Box>
      </Modal>

      {hasChildren && data.isExpanded && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          {data.children!.map((child) => (
            <OrganizationTreeItem
              key={child.id}
              data={child}
              selectedId={selectedId}
              onToggle={onToggle}
              onClick={onClick}
              onDelete={onDelete}
            />
          ))}
        </Box>
      )}
    </>
  );
}

