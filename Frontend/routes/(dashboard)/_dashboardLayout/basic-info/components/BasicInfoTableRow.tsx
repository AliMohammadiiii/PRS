import { TableRow, TableCell, Box } from '@mui/material';
import { ActionButton } from '@/components/FieldTable/ActionButton';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';
import { BasicInfoItem } from 'src/types/basicInfo';

type BasicInfoTableRowProps = {
  data: BasicInfoItem;
  onEdit?: (id: string) => void;
  isEven?: boolean;
};

export function BasicInfoTableRow({ data, onEdit, isEven = false }: BasicInfoTableRowProps) {
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
      <TableCell align="center" sx={{ minWidth: 82 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <StatusBadge status={data.status} />
        </Box>
      </TableCell>
      <TableCell align="center" sx={{ minWidth: 60 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ActionButton variant="edit" onClick={() => onEdit?.(data.id)} />
        </Box>
      </TableCell>
    </TableRow>
  );
}

