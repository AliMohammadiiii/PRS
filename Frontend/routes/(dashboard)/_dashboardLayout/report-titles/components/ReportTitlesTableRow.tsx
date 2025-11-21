import { TableRow, TableCell, Box, Chip, Typography } from '@mui/material';
import { ActionButton } from '@/components/FieldTable/ActionButton';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';
import { ReportTitleItem } from 'src/types/reportTitles';
import { Settings } from 'lucide-react';
import { IconButton } from 'injast-core/components';

type ReportTitlesTableRowProps = {
  data: ReportTitleItem;
  onEdit?: (id: string) => void;
  onDefineField?: (id: string) => void;
  isEven?: boolean;
};

export function ReportTitlesTableRow({
  data,
  onEdit,
  onDefineField,
  isEven = false,
}: ReportTitlesTableRowProps) {
  return (
    <TableRow
      sx={{
        backgroundColor: isEven ? '#fafbfc' : 'transparent',
        '&:hover': {
          backgroundColor: '#f4f6fa',
        },
        transition: 'background-color 0.2s',
        '& .MuiTableCell-root': {
          borderBottom: '1px solid #e5e7ea',
          fontSize: '14px',
        },
      }}
    >
      <TableCell align="right" sx={{ fontSize: '14px', fontWeight: 500 }}>
        {data.title}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: '14px', fontWeight: 500 }}>
        {data.code}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: '14px' }}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {data.groups.length > 0 ? (
            data.groups.map((group, index) => (
              <Chip
                key={index}
                label={group}
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  height: 24,
                }}
              />
            ))
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              -
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ fontSize: '14px' }}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {data.fields.length > 0 ? (
            data.fields.map((field) => (
              <Chip
                key={field.id}
                label={field.label}
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  height: 24,
                }}
              />
            ))
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '14px' }}>
              -
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell align="center" sx={{ minWidth: 82 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <StatusBadge status={data.status} />
        </Box>
      </TableCell>
      <TableCell align="center" sx={{ minWidth: 100 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          <ActionButton variant="edit" onClick={() => onEdit?.(data.id)} />
          <IconButton
            onClick={() => onDefineField?.(data.id)}
            color="primary"
            size="small"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
            }}
            aria-label="تعریف فیلد"
          >
            <Settings className="w-4 h-4" />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
}

