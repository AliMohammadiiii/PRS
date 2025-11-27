import * as React from 'react';
import { Box, Typography, Button, IconButton } from 'injast-core/components';
import { Trash2 } from 'lucide-react';
import { ReportField } from 'src/types/reportTitles';
import { Chip } from '@mui/material';

type FieldsListProps = {
  fields: ReportField[];
  selectedFieldId: string | null;
  onAdd: () => void;
  onSelect: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
  onDeleteAll: () => void;
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'فیلد متنی',
  switch: 'سوئیچ',
  'combo-box': 'فهرست کشویی',
  'file-upload': 'بارگذاری فایل',
  'financial-period': 'دوره گزارش',
};

export default function FieldsList({
  fields,
  selectedFieldId,
  onAdd,
  onSelect,
  onDelete,
  onDeleteAll,
}: FieldsListProps) {
  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: 2,
        px: 4,
        py: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: 16,
            fontWeight: 700,
            color: 'neutral.main',
          }}
        >
          فیلد های گزارش
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            onClick={onAdd}
            variant="contained"
            color="primary"
            buttonSize="M"
            sx={{
              borderRadius: 1,
              px: 1.5,
              py: 1.25,
              fontSize: '14px',
              fontWeight: 700,
              lineHeight: '20px',
            }}
          >
            افزودن فیلد
          </Button>
          <IconButton
            onClick={onDeleteAll}
            color="error"
            size="small"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
            }}
            aria-label="حذف همه"
          >
            <Trash2 size={16} />
          </IconButton>
        </Box>
      </Box>

      {fields.length === 0 ? (
        <Box
          sx={{
            bgcolor: 'neutral.50',
            borderRadius: 2,
            px: 4,
            py: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 267,
            gap: 2.5,
          }}
        >
          <Box
            component="img"
            src="https://www.figma.com/api/mcp/asset/a2528858-9461-43f2-81f3-a287a939e714"
            alt="Empty state"
            sx={{ width: 105, height: 58.4 }}
          />
          <Typography
            variant="body2"
            sx={{
              color: 'neutral.dark',
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: 500,
              lineHeight: '24px',
            }}
          >
            هنوز فیلدی اضافه نشده
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            maxHeight: 500,
            overflowY: 'auto',
          }}
        >
          {fields.map((field) => {
            const isSelected = field.id === selectedFieldId;
            return (
              <Box
                key={field.id}
                onClick={() => onSelect(field.id)}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  bgcolor: isSelected ? 'primary.50' : 'transparent',
                  '&:hover': {
                    bgcolor: isSelected ? 'primary.50' : 'action.hover',
                  },
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
              >
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: 'neutral.dark',
                    }}
                  >
                    {field.label}
                  </Typography>
                  <Chip
                    label={FIELD_TYPE_LABELS[field.type] || field.type}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      height: 20,
                      width: 'fit-content',
                    }}
                  />
                </Box>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(field.id);
                  }}
                  color="error"
                  size="small"
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                  }}
                  aria-label="حذف"
                >
                  <Trash2 size={16} />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

